import { deriveAll } from "@/lib/derive";
import { isWriteEnabled } from "@/lib/github";
import { isGoogleConfigured } from "@/lib/google";
import AthleteCard from "./_components/AthleteCard";
import AthleteForm from "./_components/AthleteForm";
import ChatPanel from "./_components/ChatPanel";
import PunchList from "./_components/PunchList";
import SetupBanner from "./_components/SetupBanner";
import SummaryStats from "./_components/SummaryStats";
import SyncButton from "./_components/SyncButton";
import ThemeSwitcher from "./_components/ThemeSwitcher";

export const dynamic = "force-dynamic";

function Track({ track, allTracks }) {
  return (
    <div className="track">
      <h3>{track.label}</h3>
      <div className="track-desc">{track.description}</div>
      {track.athletes.length === 0 ? (
        <div className="empty">No athletes in this track yet.</div>
      ) : (
        track.athletes.map((a) => <AthleteCard key={a.id} athlete={a} tracks={allTracks} />)
      )}
    </div>
  );
}

export default async function Page() {
  const { tracks, rosterTracks, lastSyncAt, punchList, summary } = await deriveAll();
  const writeEnabled = isWriteEnabled();
  const googleEnabled = isGoogleConfigured();
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
        <div className="page-head-actions">
          <ThemeSwitcher />
          <SyncButton enabled={googleEnabled && writeEnabled} />
          {writeEnabled && <AthleteForm tracks={rosterTracks} />}
        </div>
      </div>

      {!writeEnabled && <SetupBanner />}

      <SummaryStats summary={summary} />

      <PunchList items={punchList} />

      <section className="tracks">
        {tracks.map((t) => (
          <Track key={t.id} track={t} allTracks={rosterTracks} />
        ))}
      </section>

      <div className="footer">"met" marks today's meeting - "edit" updates athlete info - "msg" gets templates - click name for notes.</div>
      <ChatPanel />
    </main>
  );
}
