"use client";

import { useEffect, useState } from "react";
import { Card, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonoStat } from "@/components/nothing/mono-stat";

type WhoopMatch = {
  whoopId: string;
  sport: string | null;
  start: string;
  end: string;
  durationMin: number;
  strain: number | null;
  avgHr: number | null;
  maxHr: number | null;
  kcal: number | null;
};

export function WhoopStrainCard({ workoutId }: { workoutId: string }) {
  const [data, setData] = useState<WhoopMatch | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/workouts/${workoutId}/whoop`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setData(j.match ?? null);
      })
      .catch(() => {
        if (alive) setData(null);
      });
    return () => {
      alive = false;
    };
  }, [workoutId]);

  async function pull() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/workouts/${workoutId}/whoop`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? `http_${r.status}`);
      setData(j.match ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <CardLabel>WHOOP STRAIN</CardLabel>
          <div className="font-mono text-[10px] text-[color:var(--text-disabled)] mt-1">
            display-only — not deducted from kcal target
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={pull} disabled={busy}>
          {busy ? "SYNCING…" : data ? "REFRESH" : "PULL FROM WHOOP"}
        </Button>
      </div>

      {data === undefined && (
        <div className="font-mono text-[11px] text-[color:var(--text-disabled)]">…</div>
      )}

      {data === null && (
        <div className="font-mono text-[11px] text-[color:var(--text-secondary)]">
          No Whoop activity matches this workout's time window. End the workout, then
          press <span className="text-[color:var(--text-display)]">PULL FROM WHOOP</span>{" "}
          after a minute (Whoop processes data with some delay).
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MonoStat
            label="STRAIN"
            value={data.strain != null ? data.strain.toFixed(1) : "—"}
          />
          <MonoStat label="KCAL" value={data.kcal ?? "—"} unit="kcal" />
          <MonoStat label="AVG HR" value={data.avgHr ?? "—"} unit="bpm" />
          <MonoStat label="MAX HR" value={data.maxHr ?? "—"} unit="bpm" />
          <div className="col-span-2 md:col-span-4 mono-label">
            DURATION · {data.durationMin}m · {data.sport ?? "workout"}
          </div>
        </div>
      )}

      {error && (
        <div className="font-mono text-[11px] text-[color:var(--accent)] uppercase">
          → {error}
        </div>
      )}
    </Card>
  );
}
