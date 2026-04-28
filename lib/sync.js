import { fetchCalendarEvents } from "./google";
import { readJsonFile, writeJsonFile } from "./github";

function eventStart(event) {
  return event.start?.dateTime || event.start?.date || null;
}

function eventEnd(event) {
  return event.end?.dateTime || event.end?.date || null;
}

function eventMatchesAthlete(event, athlete) {
  const summary = (event.summary || "").toLowerCase();
  const keywords = athlete.calendarKeywords || [];
  for (const kw of keywords) {
    const k = (kw || "").trim().toLowerCase();
    if (k && summary.includes(k)) return { reason: `keyword:${kw}` };
  }
  return null;
}

export async function syncCalendar() {
  const { json: roster } = await readJsonFile("data/roster.json");
  const events = await fetchCalendarEvents();
  const now = new Date();

  const athleteState = {};
  for (const athlete of roster.athletes) {
    const matched = [];
    for (const event of events) {
      const m = eventMatchesAthlete(event, athlete);
      if (m) matched.push({ event, reason: m.reason });
    }

    const past = matched
      .filter((m) => {
        const s = eventStart(m.event);
        return s && new Date(s) < now;
      })
      .sort((a, b) => new Date(eventStart(b.event)) - new Date(eventStart(a.event)));

    const future = matched
      .filter((m) => {
        const s = eventStart(m.event);
        return s && new Date(s) >= now;
      })
      .sort((a, b) => new Date(eventStart(a.event)) - new Date(eventStart(b.event)));

    athleteState[athlete.id] = {
      lastMeeting: past[0] ? eventStart(past[0].event) : null,
      lastMeetingTitle: past[0]?.event?.summary ?? null,
      lastMeetingMatchedBy: past[0]?.reason ?? null,
      nextMeeting: future[0] ? eventStart(future[0].event) : null,
      nextMeetingTitle: future[0]?.event?.summary ?? null,
      nextMeetingMatchedBy: future[0]?.reason ?? null,
      matchedCount: matched.length,
    };
  }

  const { json: currentState, sha } = await readJsonFile("data/state.json");
  const nextState = {
    ...currentState,
    lastSyncAt: now.toISOString(),
    athletes: athleteState,
  };

  const changed =
    JSON.stringify(currentState.athletes || {}) !== JSON.stringify(athleteState);

  if (!changed) {
    return {
      ok: true,
      changed: false,
      eventCount: events.length,
      athleteCount: roster.athletes.length,
      lastSyncAt: now.toISOString(),
    };
  }

  await writeJsonFile("data/state.json", nextState, sha, "Sync calendar state");
  return {
    ok: true,
    changed: true,
    eventCount: events.length,
    athleteCount: roster.athletes.length,
    lastSyncAt: now.toISOString(),
  };
}
