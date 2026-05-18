"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type SyncResp = {
  ok: boolean;
  recovery?: number;
  sleep?: number;
  strain?: number;
  workouts?: number;
  errors?: Record<string, string>;
  sinceDays?: number;
  error?: string;
};

export function SyncWhoopButton() {
  const router = useRouter();
  const [busy, setBusy] = useState<null | number>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string> | null>(null);

  async function sync(days: number) {
    setBusy(days);
    setMsg(null);
    setErrors(null);
    try {
      const r = await fetch(`/api/whoop/sync?days=${days}`, { method: "POST" });
      const data: SyncResp = await r.json();
      if (r.ok && data.ok) {
        const errCount = data.errors ? Object.keys(data.errors).length : 0;
        setMsg(
          `OK · ${data.sinceDays ?? days}d · rec ${data.recovery ?? 0} · sleep ${data.sleep ?? 0} · strain ${data.strain ?? 0} · workouts ${data.workouts ?? 0}${
            errCount > 0 ? ` · ${errCount} err` : ""
          }`,
        );
        if (errCount > 0) setErrors(data.errors ?? null);
        router.refresh();
      } else {
        setMsg(`ERR · ${data.error ?? r.status}`);
      }
    } catch (e) {
      setMsg(`ERR · ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={() => sync(30)}
          disabled={busy !== null}
          variant="outline"
          size="sm"
        >
          {busy === 30 ? "SYNCING…" : "SYNC 30D"}
        </Button>
        <Button
          onClick={() => sync(180)}
          disabled={busy !== null}
          variant="outline"
          size="sm"
        >
          {busy === 180 ? "PULLING…" : "PULL 180D"}
        </Button>
        <Button
          onClick={() => sync(365)}
          disabled={busy !== null}
          variant="outline"
          size="sm"
        >
          {busy === 365 ? "PULLING…" : "PULL 1Y"}
        </Button>
      </div>
      {msg && (
        <span className="font-mono text-[11px] text-[color:var(--text-secondary)] uppercase tracking-[0.08em]">
          {msg}
        </span>
      )}
      {errors && (
        <div className="font-mono text-[11px] text-[color:var(--accent)] uppercase tracking-[0.06em] text-right max-w-md">
          {Object.entries(errors).map(([k, v]) => (
            <div key={k}>
              → {k}: {v.slice(0, 80)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
