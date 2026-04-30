async function getAccessToken() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google OAuth not configured. Need GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN."
    );
  }
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google token refresh failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  return data.access_token;
}

export async function fetchCalendarEvents({ pastDays = 90, futureDays = 90 } = {}) {
  const accessToken = await getAccessToken();
  const now = new Date();
  const timeMin = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + futureDays * 24 * 60 * 60 * 1000).toISOString();
  const all = [];
  let pageToken;
  do {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google Calendar fetch failed: ${res.status} ${body}`);
    }
    const data = await res.json();
    all.push(...(data.items || []));
    pageToken = data.nextPageToken;
  } while (pageToken && all.length < 1000);
  return all;
}

export function isGoogleConfigured() {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  );
}

export async function searchCalendarEvents({ query, daysBack = 365, maxResults = 50 }) {
  const accessToken = await getAccessToken();
  const now = new Date();
  const timeMin = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    q: query,
    timeMin,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(maxResults),
  });
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Calendar search failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  return data.items || [];
}

export async function createCalendarEvent({
  title,
  startISO,
  endISO,
  attendeeEmails = [],
  addMeetLink = true,
  description,
}) {
  const accessToken = await getAccessToken();
  const body = {
    summary: title,
    start: { dateTime: startISO, timeZone: "America/Los_Angeles" },
    end: { dateTime: endISO, timeZone: "America/Los_Angeles" },
    attendees: attendeeEmails.map((email) => ({ email })),
  };
  if (description) body.description = description;
  if (addMeetLink) {
    body.conferenceData = {
      createRequest: {
        requestId: `meet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Google Calendar create event failed: ${res.status} ${errBody}`);
  }
  return await res.json();
}
