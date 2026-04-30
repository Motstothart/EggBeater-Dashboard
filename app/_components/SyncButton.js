"use client";

import { useState, useTransition } from "react";
import { syncCalendarNow } from "@/lib/actions";

export default function SyncButton({ enabled }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState(null);

  if (!enabled) {
    return (
      <button className="btn ghost" disabled title="Set Google OAuth env vars to enable">
        Sync (not configured)
      </button>
    );
  }

  const onClick = () => {
    setMsg(null);
    startTransition(async () => {
      const result = await syncCalendarNow();
      if (!result.ok) {
        setMsg(`Failed: ${result.error}`);
        setTimeout(() => setMsg(null), 4000);
      }
    });
  };

  return (
    <span className="sync-control">
      <button className="btn" onClick={onClick} disabled={pending}>
        {pending ? "Syncing..." : "Sync now"}
      </button>
      {msg && <span className="sync-msg">{msg}</span>}
    </span>
  );
}
