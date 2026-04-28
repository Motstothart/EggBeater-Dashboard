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
  const calLast = athleteState.lastMeeting ? new Date(athleteState.lastMeeting) : null;
  const manualLastRaw = actions.manualMeetings?.[athlete.id]?.at ?? null;
  const manualLast = manualLastRaw ? new Date(manualLastRaw) : null;
  const candidates = [calLast, manualLast].filter(Boolean);
  const lastMeeting = candidates.length ? new Date(Math.max(...candidates.map((d) => d.getTime()))) : null;
  const lastMeetingSource = lastMeeting && manualLast && (!calLast || manualLast >= calLast) ? "manual" : "calendar";
  const nextMeeting = athleteState.nextMeeting ? new Date(athleteState.nextMeeting) : null;
  const warnWeeks = rules.meetingWarnWeeks ?? 3;
  const overdueWeeks = rules.meetingOverdueWeeks ?? 5;
  const warnDays = rules.deliverableWarnDays;

  let meetingStatus;
  let weeksSinceLast = null;
  if (lastMeeting) {
    weeksSinceLast = Math.floor((now - lastMeeting) / (DAY_MS * 7));
    if (weeksSinceLast >= overdueWeeks) meetingStatus = "overdue";
    else if (weeksSinceLast >= warnWeeks) meetingStatus = "warn";
    else meetingStatus = "ok";
  } else {
    meetingStatus = "no-data";
  }

  const deliverables = (athlete.deliverables || [])
    .map((d) => {
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
    })
    .sort((a, b) => {
      const aDone = a.status === "done";
      const bDone = b.status === "done";
      if (aDone !== bDone) return aDone ? 1 : -1;
      return a.daysUntil - b.daysUntil;
    });

  const openDeliverables = deliverables.filter((d) => d.status !== "done");
  const nextDeliverable = openDeliverables[0] ?? null;

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
    lastMeetingSource,
    nextMeeting: nextMeeting ? nextMeeting.toISOString() : null,
    weeksSinceLast,
    meetingStatus,
    deliverables,
    nextDeliverable,
    notes,
    cardAlert,
  };
}

const ALERT_RANK = { overdue: 0, warn: 1, "no-data": 2, ok: 3 };

function sortByPriority(a, b) {
  const ra = ALERT_RANK[a.cardAlert] ?? 99;
  const rb = ALERT_RANK[b.cardAlert] ?? 99;
  if (ra !== rb) return ra - rb;
  return a.name.localeCompare(b.name);
}

export async function deriveAll(now = new Date()) {
  const { roster, state, actions } = await loadAll();
  const allAthletes = roster.athletes.map((a) => deriveAthlete(a, state, actions, roster.rules, now));

  const tracks = roster.tracks.map((track) => ({
    ...track,
    athletes: allAthletes.filter((a) => a.track === track.id).sort(sortByPriority),
  }));

  const summary = {
    overdueAthletes: allAthletes.filter((a) => a.meetingStatus === "overdue").length,
    warnAthletes: allAthletes.filter((a) => a.meetingStatus === "warn").length,
    noDataAthletes: allAthletes.filter((a) => a.meetingStatus === "no-data").length,
    okAthletes: allAthletes.filter((a) => a.meetingStatus === "ok").length,
    overdueDeliverables: allAthletes.reduce(
      (sum, a) => sum + a.deliverables.filter((d) => d.alert === "overdue").length,
      0
    ),
    warnDeliverables: allAthletes.reduce(
      (sum, a) => sum + a.deliverables.filter((d) => d.alert === "warn").length,
      0
    ),
    totalAthletes: allAthletes.length,
  };

  return {
    tracks,
    rosterTracks: roster.tracks,
    lastSyncAt: state.lastSyncAt,
    punchList: actions.punchList ?? [],
    completed: actions.completed ?? [],
    summary,
  };
}
