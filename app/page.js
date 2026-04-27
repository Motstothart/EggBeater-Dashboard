import { deriveAll } from "@/lib/derive";
import { isWriteEnabled } from "@/lib/github";
import AthleteCard from "./_components/AthleteCard";
import AthleteForm from "./_components/AthleteForm";
import PunchList from "./_components/PunchList";
import SetupBanner from "./_components/SetupBanner";

export const dynamic = "force-dynamic";

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

export default async function Page() {
  const { tracks, rosterTracks, lastSyncAt, punchList } = await deriveAll();
  const writeEnabled = isWriteEnabled();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <main>
      <div className="page-head">
        <div>
          <h1>EggBeater Dashboard</h1>
          <div className="subtitle">
            {today}
            {lastSyncAt ? ` - last sync ${new Date(lastSyncAt).toLocaleString()}` : " - no sync yet"}
          </div>
        </div>
        {writeEnabled && <AthleteForm tracks={rosterTracks} />}
      </div>

      {!writeEnabled && <SetupBanner />}

      <PunchList items={punchList} />

      <section className="tracks">
        {tracks.map((t) => (
          <Track key={t.id} track={t} />
        ))}
      </section>

      <div className="footer">Phase 1 - click name for notes, tick deliverables, click "msg" for templates.</div>
    </main>
  );
}
