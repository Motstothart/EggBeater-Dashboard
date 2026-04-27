import staticRoster from "@/data/roster.json";
import staticState from "@/data/state.json";
import staticActions from "@/data/actions.json";
import { readJsonFile, isWriteEnabled } from "./github";

const DAY_MS = 24 * 60 * 60 * 1000;

async function loadJson(path, fallback) {
  if (!isWriteEnabled()) return fallback;
  try {
    const { json } = await readJsonFile(path);
    return json;
  } catch (e) {
    console.error(`Failed to read ${path} from GitHub, using bundled:`, e.message);
    return fallback;
  }
}

export async function loadAll() {
  const [roster, state, actions] = await Promise.all([
    loadJson("data/roster.json", staticRoster),
    loadJson("data/state.json", staticState),
    loadJson("data/actions.json", staticActions),
  ]);
  return { roster, state, actions };
}

function deriveAthlete(athlete, state, actions, rules, now) {
  const athleteState = state.athletes?.[athlete.id] ?? {};
  const lastMeeting = athleteState.lastMeeting ? new Date(athleteState.lastMeeting) : null;
  const nextMeeting = athleteState.nextMeeting ? new Date(athleteState.nextMeeting) : null;
  const overdueWeeks = rules.meetingOverdueWeeks;
  const warnDays = rules.deliverableWarnDays;

  let meetingStatus;
  let weeksSinceLast = null;
  if (lastMeeting) {
    weeksSinceLast = Math.floor((now - lastMeeting) / (DAY_MS * 7));
    if (weeksSinceLast >= overdueWeeks) meetingStatus = "overdue";
    else if (weeksSinceLast >= overdueWeeks - 1) meetingStatus = "warn";
    else meetingStatus = "ok";
  } else {
    meetingStatus = "no-data";
  }

  const deliverables = (athlete.deliverables || []).map((d) => {
    const due = new Date(d.due);
    const daysUntil = Math.ceil((due - now) / DAY_MS);
    let alert = "ok";
    if (d.status !== "done") {
      if (daysUntil < 0) alert = "overdue";
      else if (daysUntil <= warnDays) alert = "warn";
    } else {
      alert = "done";
    }
    return { ...d, daysUntil, alert };
  });

  const openDeliverables = deliverables.filter((d) => d.status !== "done");
  const nextDeliverable = openDeliverables.sort((a, b) => a.daysUntil - b.daysUntil)[0] ?? null;

  const notes = actions.athleteNotes?.[athlete.id] ?? [];

  let cardAlert = "ok";
  if (meetingStatus === "overdue") cardAlert = "overdue";
  else if (deliverables.some((d) => d.alert === "overdue")) cardAlert = "overdue";
  else if (meetingStatus === "warn") cardAlert = "warn";
  else if (deliverables.some((d) => d.alert === "warn")) cardAlert = "warn";
  else if (meetingStatus === "no-data") cardAlert = "no-data";

  return {
    ...athlete,
    lastMeeting: lastMeeting ? lastMeeting.toISOString() : null,
    nextMeeting: nextMeeting ? nextMeeting.toISOString() : null,
    weeksSinceLast,
    meetingStatus,
    deliverables,
    nextDeliverable,
    notes,
    cardAlert,
  };
}

export async function deriveAll(now = new Date()) {
  const { roster, state, actions } = await loadAll();
  const tracks = roster.tracks.map((track) => ({
    ...track,
    athletes: roster.athletes
      .filter((a) => a.track === track.id)
      .map((a) => deriveAthlete(a, state, actions, roster.rules, now)),
  }));
  return {
    tracks,
    rosterTracks: roster.tracks,
    lastSyncAt: state.lastSyncAt,
    punchList: actions.punchList ?? [],
    completed: actions.completed ?? [],
  };
}
