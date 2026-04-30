import Anthropic from "@anthropic-ai/sdk";
import { searchCalendarEvents, createCalendarEvent } from "@/lib/google";
import { loadAll } from "@/lib/derive";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TOOLS = [
  {
    name: "search_calendar_events",
    description:
      "Search past Google Calendar events by query string. Use this to find prior sessions for a pair of names, identify the most recent session number to increment, and pull attendee email addresses (student + parent emails) from existing events.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query - matches event title and attendee fields. e.g. 'Will Jake' or 'Sam Oliver' or 'Leila Lucy'.",
        },
        days_back: {
          type: "number",
          description: "How many days back to search. Default 365.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "create_calendar_event",
    description:
      "Create a Google Calendar event. ALWAYS confirm details with the user (title, date/time, attendees, Meet link) BEFORE calling this tool. Sends invitations to all attendees automatically.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description:
            "Event title following the pair's existing naming convention exactly.",
        },
        start_iso: {
          type: "string",
          description:
            "ISO 8601 start time with Pacific Time offset, e.g. '2026-05-04T14:00:00-07:00'.",
        },
        end_iso: {
          type: "string",
          description:
            "ISO 8601 end time with Pacific Time offset. Default duration is 30 minutes unless specified.",
        },
        attendee_emails: {
          type: "array",
          items: { type: "string" },
          description:
            "Email addresses to invite. Pull these from prior events for the pair.",
        },
        add_meet_link: {
          type: "boolean",
          description:
            "Whether to attach a Google Meet link. Default true. Only set false if user explicitly says no Meet link.",
        },
      },
      required: ["title", "start_iso", "end_iso", "attendee_emails"],
    },
  },
  {
    name: "list_athletes",
    description:
      "List all athletes in the dashboard roster (id, name, track, mentor). Useful for general questions about who's being tracked.",
    input_schema: { type: "object", properties: {} },
  },
];

async function executeTool(name, input) {
  if (name === "search_calendar_events") {
    const events = await searchCalendarEvents({
      query: input.query,
      daysBack: input.days_back ?? 365,
    });
    return events.map((e) => ({
      title: e.summary,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      attendees: (e.attendees || []).map((a) => a.email).filter(Boolean),
      organizer: e.organizer?.email,
      hangoutLink: e.hangoutLink,
    }));
  }
  if (name === "create_calendar_event") {
    const event = await createCalendarEvent({
      title: input.title,
      startISO: input.start_iso,
      endISO: input.end_iso,
      attendeeEmails: input.attendee_emails || [],
      addMeetLink: input.add_meet_link ?? true,
    });
    return {
      ok: true,
      eventId: event.id,
      title: event.summary,
      start: event.start?.dateTime,
      end: event.end?.dateTime,
      meetLink: event.hangoutLink,
      htmlLink: event.htmlLink,
      attendees: (event.attendees || []).map((a) => a.email),
    };
  }
  if (name === "list_athletes") {
    const { roster } = await loadAll();
    return roster.athletes.map((a) => ({
      id: a.id,
      name: a.name,
      track: a.track,
      mentorName: a.mentorName,
    }));
  }
  throw new Error(`Unknown tool: ${name}`);
}

function buildSystemPrompt() {
  const today = new Date().toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: "America/Los_Angeles",
  });
  return `You are a scheduling assistant for Marshall, a water polo recruiting coach. Your primary job is to schedule mentor-student sessions on Marshall's Google Calendar (motstothart@gmail.com).

Today is ${today}.

# Pair naming conventions (use exact format)
- Will / Jake — "Will / Jake Session X"
- Preston / Jake — "Preston / Jake Session X"
- Lucas / Lukas — "Lucas / Lukas Session X"
- Donny / Lukas — "Donny / Lukas Session X"
- Sam / Oliver — "Sam / Oliver Session X"
- Leila / Lucy — "Leila - Lucy Session X" (note: dash, not slash)
- A new pair's first meeting: "Firstname / Lastname Intro Session"

# Process for scheduling
1. Identify the pair from the user's request. Connor is dropped — never include Connor in any event.
2. Use search_calendar_events with the pair's first names (e.g. "Will Jake") to find past sessions.
3. From those past events:
   - Find the most recent session number and increment by one.
   - Match the existing title format exactly.
   - Pull attendee email addresses (student email + any parent/guardian emails). Carry these forward.
4. Resolve the date and time:
   - If user gives a specific date, use it.
   - If user says "tomorrow", "this Sunday", etc., resolve to a specific calendar date based on today's date above.
   - If no date is given, ask before proceeding.
   - Default duration is 30 minutes unless specified.
   - All times in Pacific Time (America/Los_Angeles).
5. Present a summary of the proposed event and ask the user to confirm:
   - Event title
   - Date and time (in Pacific Time)
   - Attendee emails
   - Google Meet link: yes/no (always yes unless user said no)
6. ONLY AFTER the user confirms (e.g. "yes", "confirm", "go ahead"), call create_calendar_event.
7. After creation, report back: event title, date/time, confirmation that invites were sent, and the Meet link.

# Rules
- Always confirm before calling create_calendar_event. Never schedule without explicit confirmation.
- Always include a Google Meet link unless the user explicitly says not to.
- Connor is dropped — never include him as an attendee.
- All times are Pacific Time.
- Be concise. Don't over-explain.`;
}

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured on the server." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = body.messages || [];
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  const client = new Anthropic();
  const system = buildSystemPrompt();
  const newMessages = [];

  try {
    for (let iteration = 0; iteration < 10; iteration++) {
      const response = await client.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 8000,
        system,
        tools: TOOLS,
        messages: [...messages, ...newMessages],
      });

      newMessages.push({ role: "assistant", content: response.content });

      if (response.stop_reason === "end_turn") break;

      if (response.stop_reason === "tool_use") {
        const toolResults = [];
        for (const block of response.content) {
          if (block.type !== "tool_use") continue;
          try {
            const result = await executeTool(block.name, block.input);
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          } catch (e) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: `Error: ${e.message}`,
              is_error: true,
            });
          }
        }
        newMessages.push({ role: "user", content: toolResults });
        continue;
      }

      break;
    }

    return Response.json({ messages: newMessages });
  } catch (e) {
    return Response.json(
      { error: e.message || "Chat failed", messages: newMessages },
      { status: 500 }
    );
  }
}
