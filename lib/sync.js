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
  const description = (event.description || "").toLowerCase();

  const attendeeEmails = (event.attendees || [])
    .map((a) => (a.email || "").toLowerCase())
    .filter(Boolean);

  if (athlete.athleteEmail) {
    if (attendeeEmails.includes(athlete.athleteEmail.toLowerCase())) return { reason: "athlete-email" };
  }
  for (const pEmail of athlete.parentEmails || []) {
    if (pEmail && attendeeEmails.includes(pEmail.toLowerCase())) return { reason: "parent-email" };
  }
  if (athlete.mentorEmail && attendeeEmails.includes(athlete.mentorEmail.toLowerCase())) {
    return { reason: "mentor-email" };
  }

  const firstName = athlete.name.split(/\s+/)[0].toLowerCase();
  if (firstName.length >= 3) {
    const wordRe = new RegExp(`\\b${firstName.replace(/[^a-z0-9]/g, "")}\\b`, "i");
    if (wordRe.test(summary) || wordRe.test(description)) return { reason: "name-in-title" };
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
