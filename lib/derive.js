import roster from "@/data/roster.json";
import state from "@/data/state.json";
import actions from "@/data/actions.json";

const DAY_MS = 24 * 60 * 60 * 1000;

export function loadAll() {
  return { roster, state, actions };
}

export function deriveAthlete(athlete, now = new Date()) {
  const athleteState = state.athletes?.[athlete.id] ?? {};
  const lastMeeting = athleteState.lastMeeting ? new Date(athleteState.lastMeeting) : null;
  const nextMeeting = athleteState.nextMeeting ? new Date(athleteState.nextMeeting) : null;
  const overdueWeeks = roster.rules.meetingOverdueWeeks;
  const warnDays = roster.rules.deliverableWarnDays;

  let meetingStatus = "unknown";
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
    let status = d.status;
    let alert = "ok";
    if (status !== "done") {
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
    lastMeeting,
    nextMeeting,
    weeksSinceLast,
    meetingStatus,
    deliverables,
    nextDeliverable,
    notes,
    cardAlert,
  };
}

export function deriveAll(now = new Date()) {
  const tracks = roster.tracks.map((track) => ({
    ...track,
    athletes: roster.athletes
      .filter((a) => a.track === track.id)
      .map((a) => deriveAthlete(a, now)),
  }));
  return { tracks, lastSyncAt: state.lastSyncAt, punchList: actions.punchList ?? [], completed: actions.completed ?? [] };
}
