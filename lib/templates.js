function parentName(athlete) {
  return athlete.parents?.[0]?.name || "[parent]";
}

function weeksLabel(weeks) {
  if (weeks == null) return "a few weeks";
  if (weeks <= 0) return "a bit of time";
  if (weeks === 1) return "a week";
  return `${weeks} weeks`;
}

export function scheduleMeetingMessage(athlete) {
  const parent = parentName(athlete);
  const weeks = weeksLabel(athlete.weeksSinceLast);
  return `Hi ${parent}, it's been ${weeks} since ${athlete.name}'s last chat. Wondering if this weekend works for the next one?`;
}

export function checkInMessage(athlete) {
  const parent = parentName(athlete);
  return `Hi ${parent}, just wanted to check in on how things are going with ${athlete.name}. Let me know if there's anything coming up I can help with.`;
}

export function templateRequestMessage(athlete) {
  return `Hi ${athlete.name}, getting ready to start work on your outreach emails this weekend. Could you send me an example of an email you've written before that you're happy with? Helps me match your voice.`;
}

export function templates(athlete) {
  return [
    { id: "schedule", label: "Schedule next meeting", body: scheduleMeetingMessage(athlete) },
    { id: "checkin", label: "Light check-in", body: checkInMessage(athlete) },
    { id: "template-request", label: "Request email template from athlete", body: templateRequestMessage(athlete) },
  ];
}
