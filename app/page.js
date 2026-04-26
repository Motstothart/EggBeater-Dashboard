import { deriveAll } from "@/lib/derive";

export const dynamic = "force-dynamic";

function formatDate(d) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MeetingPill({ athlete }) {
  if (athlete.meetingStatus === "no-data") {
    return <span className="pill no-data">no calendar data</span>;
  }
  if (athlete.meetingStatus === "overdue") {
    return <span className="pill overdue">overdue: {athlete.weeksSinceLast}w since last</span>;
  }
  if (athlete.meetingStatus === "warn") {
    return <span className="pill warn">{athlete.weeksSinceLast}w since last</span>;
  }
  return <span className="pill ok">last {athlete.weeksSinceLast}w ago</span>;
}

function NextMeetingPill({ athlete }) {
  if (!athlete.nextMeeting) return null;
  return <span className="pill">next {formatDate(athlete.nextMeeting)}</span>;
}

function DeliverableRow({ d }) {
  const due = formatDate(d.due);
  const cls = d.status === "done" ? "done" : d.alert;
  let suffix = "";
  if (d.status !== "done") {
    if (d.daysUntil < 0) suffix = `${Math.abs(d.daysUntil)}d overdue`;
    else suffix = `in ${d.daysUntil}d`;
  } else {
    suffix = "done";
  }
  return (
    <div className={`deliverable ${cls}`}>
      <span>{d.label}</span>
      <span className="deliverable-due">
        {due} - {suffix}
      </span>
    </div>
  );
}

function AthleteCard({ athlete }) {
  const parents = athlete.parents.map((p) => p.name).join(" and ");
  return (
    <div className={`athlete-card ${athlete.cardAlert}`}>
      <div className="athlete-name">{athlete.name}</div>
      <div className="athlete-meta">
        {parents ? `Parent: ${parents}` : null}
        {athlete.mentorName ? ` - Mentor: ${athlete.mentorName}` : null}
      </div>
      <div className="status-row">
        <MeetingPill athlete={athlete} />
        <NextMeetingPill athlete={athlete} />
      </div>
      {athlete.deliverables.length > 0 && (
        <div className="deliverables">
          {athlete.deliverables.map((d) => (
            <DeliverableRow key={d.id} d={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function Track({ track }) {
  return (
    <div className="track">
      <h3>{track.label}</h3>
      <div className="track-desc">{track.description}</div>
      {track.athletes.length === 0 ? (
        <div className="empty">No athletes in this track yet.</div>
      ) : (
        track.athletes.map((a) => <AthleteCard key={a.id} athlete={a} />)
      )}
    </div>
  );
}

export default function Page() {
  const { tracks, lastSyncAt, punchList } = deriveAll();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <main>
      <h1>EggBeater Dashboard</h1>
      <div className="subtitle">
        {today}
        {lastSyncAt ? ` - last sync ${new Date(lastSyncAt).toLocaleString()}` : " - no sync yet"}
      </div>

      <section className="punch-list">
        <h2>Today's Punch List</h2>
        {punchList.length === 0 ? (
          <div className="punch-list-empty">
            Nothing here yet. The scheduled task will populate this once Calendar is wired up.
          </div>
        ) : (
          <ul>
            {punchList.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="tracks">
        {tracks.map((t) => (
          <Track key={t.id} track={t} />
        ))}
      </section>

      <div className="footer">Phase 0 scaffold - read-only stub. Interactivity arrives in Phase 1.</div>
    </main>
  );
}
