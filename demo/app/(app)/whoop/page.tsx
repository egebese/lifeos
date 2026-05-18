"use client";

import { useDemoStore } from "@/lib/demo/store";
import { Card, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonoStat } from "@/components/nothing/mono-stat";
import { Gauge } from "@/components/nothing/gauge";
import { SyncWhoopButton } from "./sync-button";
import { WhoopHistory } from "@/components/whoop/whoop-history";

export default function WhoopPage() {
  const { state, update } = useDemoStore();
  const connected = state.whoopConnected;

  const rec = connected
    ? [...state.whoopRecovery].sort((a, b) => b.date.localeCompare(a.date))[0]
    : undefined;
  const sleep = connected
    ? [...state.whoopSleep].sort(
        (a, b) => +new Date(b.start) - +new Date(a.start),
      )[0]
    : undefined;
  const strain = connected
    ? [...state.whoopStrain].sort((a, b) => b.date.localeCompare(a.date))[0]
    : undefined;
  const recentWorkouts = connected
    ? [...state.whoopWorkouts]
        .sort((a, b) => +new Date(b.start) - +new Date(a.start))
        .slice(0, 10)
    : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-4">
        <div>
          <div className="mono-label">DEVICE · WHOOP</div>
          <h1 className="font-display text-4xl mt-1">whoop</h1>
        </div>
        {connected ? <SyncWhoopButton /> : null}
      </header>

      {!connected ? (
        <Card>
          <CardLabel>NOT CONNECTED</CardLabel>
          <p className="font-body text-sm text-[color:var(--text-secondary)] mt-2">
            Connect your Whoop account to sync recovery, sleep, strain, and workouts.
          </p>
          <p className="font-mono text-[11px] text-[color:var(--text-disabled)] uppercase tracking-[0.08em] mt-2">
            Demo: clicking CONNECT will toggle the connected state and show seeded data.
          </p>
          <div className="mt-4">
            <Button onClick={() => update({ whoopConnected: true })}>
              CONNECT WHOOP →
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="flex flex-col items-center">
              <CardLabel>RECOVERY</CardLabel>
              <Gauge
                value={rec?.score ?? 0}
                max={100}
                size={160}
                unit="%"
                label="TODAY"
                accentByValue
              />
            </Card>
            <Card>
              <CardLabel>SLEEP</CardLabel>
              <MonoStat
                label="HOURS"
                value={
                  sleep
                    ? (
                        (new Date(sleep.end).getTime() - new Date(sleep.start).getTime()) /
                        3_600_000
                      ).toFixed(1)
                    : "—"
                }
                unit="h"
              />
              <div className="mt-3">
                <MonoStat
                  label="PERFORMANCE"
                  value={sleep?.performancePct ? Number(sleep.performancePct).toFixed(0) : "—"}
                  unit="%"
                />
              </div>
            </Card>
            <Card>
              <CardLabel>STRAIN</CardLabel>
              <MonoStat
                label="SCORE"
                value={strain?.score ? Number(strain.score).toFixed(1) : "—"}
              />
              <div className="mt-3">
                <MonoStat label="AVG HR" value={strain?.avgHr ?? "—"} unit="bpm" />
              </div>
            </Card>
          </section>

          <WhoopHistory days={30} />

          {recentWorkouts.length > 0 && (
            <Card>
              <CardLabel>RECENT WORKOUTS (WHOOP)</CardLabel>
              <ul className="mt-2 space-y-0">
                {recentWorkouts.map((w) => (
                  <li
                    key={w.id}
                    className="grid grid-cols-[1fr_auto_auto] gap-3 py-2 border-b border-[color:var(--border)]"
                  >
                    <span className="font-body text-sm">{w.sport ?? "workout"}</span>
                    <span className="font-mono text-[11px] text-[color:var(--text-secondary)]">
                      {new Date(w.start).toLocaleDateString("en-US")}
                    </span>
                    <span className="font-mono text-[11px] text-[color:var(--text-display)]">
                      {w.strain ? `strain ${Number(w.strain).toFixed(1)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
