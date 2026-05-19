"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  Flame,
  HeartPulse,
  Moon,
  Scale,
  Zap,
} from "lucide-react";
import { useDemoStore } from "@/lib/demo/store";
import { MonoStat } from "@/components/nothing/mono-stat";
import { SegmentBar } from "@/components/nothing/segment-bar";
import { Ticker } from "@/components/nothing/ticker";
import { Gauge } from "@/components/nothing/gauge";
import { Card, CardLabel } from "@/components/ui/card";
import { MacroBlock } from "@/components/food/macro-block";
import { WeightProjection } from "@/components/dashboard/weight-projection";
import { DayNav } from "@/components/dashboard/day-nav";
import { bmi, bmr, macroSplit, recommendedKcal, tdee } from "@/lib/nutrition";
import { formatKg, greetingFor, resolveDisplayName } from "@/lib/utils";

function formatDayShort(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(+d)) return dateStr;
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short" }).toUpperCase();
}

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function Dashboard() {
  const { state } = useDemoStore();
  const sp = useSearchParams();
  const dayParam = sp.get("day");
  const todayKey = ymdLocal(new Date());
  const selectedKey =
    dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : todayKey;
  const isToday = selectedKey === todayKey;

  const dayStart = new Date(`${selectedKey}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const prof = state.profile;
  // Demo seeds Whoop connected by default, but profile can disconnect it;
  // mirror the main app's conditional layout when off.
  const whoopConnected = state.whoopConnected;

  const todayFood = state.foodEntries.filter((e) => {
    const t = new Date(e.consumedAt);
    return t >= dayStart && t < dayEnd;
  });

  const totalKcal = todayFood.reduce((a, e) => a + Number(e.kcal ?? 0), 0);
  const totalP = todayFood.reduce((a, e) => a + Number(e.proteinG ?? 0), 0);
  const totalC = todayFood.reduce((a, e) => a + Number(e.carbsG ?? 0), 0);
  const totalF = todayFood.reduce((a, e) => a + Number(e.fatG ?? 0), 0);

  const recentWeight = [...state.bodyMetrics].sort(
    (a, b) => +new Date(b.recordedAt) - +new Date(a.recordedAt),
  )[0];

  const weightKg = Number(prof?.weightKg ?? recentWeight?.weightKg ?? 0);
  const heightCm = Number(prof?.heightCm ?? 0);
  const age = prof?.age ?? 0;
  const sex = prof?.sex ?? "m";
  const activity = prof?.activityLevel ?? "moderate";
  const goal = prof?.goal ?? "maintain";

  const computedBmi = weightKg && heightCm ? bmi(weightKg, heightCm) : 0;
  const computedBmr =
    weightKg && heightCm && age ? bmr({ sex, weightKg, heightCm, age }) : 0;
  const formulaTdee = computedBmr ? tdee(computedBmr, activity) : 0;
  // Demo: always falls back to formula TDEE
  const computedTdee = formulaTdee;
  const kcalTarget = computedTdee ? Math.round(recommendedKcal(computedTdee, goal)) : 0;
  const macroTargets =
    kcalTarget > 0 && weightKg > 0 ? macroSplit(kcalTarget, weightKg, goal) : null;

  const recovery = whoopConnected
    ? state.whoopRecovery.find((r) => r.date === selectedKey)
    : undefined;

  const sleep = whoopConnected
    ? [...state.whoopSleep]
        .filter((s) => {
          const t = new Date(s.start);
          return t >= dayStart && t < dayEnd;
        })
        .sort((a, b) => +new Date(b.start) - +new Date(a.start))[0]
    : undefined;

  const sleepHours = sleep
    ? (new Date(sleep.end).getTime() - new Date(sleep.start).getTime()) / 3_600_000
    : null;

  const strain = whoopConnected
    ? state.whoopStrain.find((s) => s.date === selectedKey)
    : undefined;

  const lastWorkout = [...state.workouts].sort(
    (a, b) => +new Date(b.startedAt) - +new Date(a.startedAt),
  )[0];

  const headerDate = dayStart.toLocaleDateString("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });

  const name = resolveDisplayName({
    displayName: prof?.displayName,
    email: "demo@lifeos.local",
  });
  const greeting = greetingFor("en", name);
  const kcalLabel = isToday ? "KCAL TODAY" : `KCAL · ${formatDayShort(selectedKey)}`;

  return (
    <div className="space-y-8">
      <header>
        <div className="mono-label">
          {headerDate.toUpperCase()}
          {!isToday && (
            <span className="ml-2 text-[color:var(--accent)]">· VIEWING</span>
          )}
        </div>
        <h1 className="font-display text-4xl md:text-5xl mt-1">{greeting}</h1>
      </header>

      <div className="flex items-center gap-4 py-2 px-1 -mx-4 px-4 border-b border-[color:var(--border)]">
        <Ticker
          bare
          className="flex-1 min-w-0"
          items={[
            { label: "BMI", value: computedBmi ? computedBmi.toFixed(1) : "—" },
            {
              label: "TDEE · EST",
              value: computedTdee ? `${Math.round(computedTdee)}` : "—",
            },
            { label: "TARGET", value: kcalTarget ? `${kcalTarget}` : "—" },
            { label: "WEIGHT", value: weightKg ? `${formatKg(weightKg)}kg` : "—" },
            { label: "GOAL", value: goal.toUpperCase() },
          ]}
        />
        <DayNav selected={selectedKey} today={todayKey} />
      </div>

      <section
        className={`grid gap-4 ${
          whoopConnected ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"
        }`}
      >
        <Card>
          <MonoStat
            label={kcalLabel}
            value={Math.round(totalKcal)}
            unit={`/ ${kcalTarget || "?"}`}
            icon={<Flame size={12} strokeWidth={1.75} />}
          />
          {kcalTarget > 0 && (
            <div className="mt-4">
              <SegmentBar
                value={Math.min(totalKcal, kcalTarget)}
                max={kcalTarget}
                color={
                  totalKcal > kcalTarget * 1.1
                    ? "var(--accent)"
                    : totalKcal < kcalTarget * 0.8
                      ? "var(--warning)"
                      : "var(--success)"
                }
              />
            </div>
          )}
        </Card>

        {whoopConnected && (
          <Card>
            <MonoStat
              label="STRAIN"
              value={strain?.score ? Number(strain.score).toFixed(1) : "—"}
              icon={<Zap size={12} strokeWidth={1.75} />}
            />
            {strain?.score != null && (
              <div className="mt-4">
                <SegmentBar
                  value={Number(strain.score)}
                  max={21}
                  color="var(--text-display)"
                />
              </div>
            )}
          </Card>
        )}

        {whoopConnected && (
          <Card>
            <MonoStat
              label="SLEEP"
              value={sleepHours ? sleepHours.toFixed(1) : "—"}
              unit="h"
              icon={<Moon size={12} strokeWidth={1.75} />}
            />
            {sleep?.performancePct != null && (
              <div className="font-mono text-[10px] text-[color:var(--text-secondary)] uppercase tracking-[0.08em] mt-2">
                PERFORMANCE {Number(sleep.performancePct).toFixed(0)}%
              </div>
            )}
          </Card>
        )}

        <Card>
          <MonoStat
            label="WEIGHT"
            value={weightKg ? formatKg(weightKg) : "—"}
            unit="kg"
            icon={<Scale size={12} strokeWidth={1.75} />}
          />
        </Card>
      </section>

      <section
        className={`grid gap-4 items-stretch ${
          whoopConnected
            ? "grid-cols-1 md:grid-cols-[minmax(260px,1fr)_2fr]"
            : "grid-cols-1"
        }`}
      >
        {whoopConnected && (
          <Card className="flex flex-col items-center gap-3">
            <CardLabel className="flex items-center gap-1.5 self-start">
              <HeartPulse size={12} strokeWidth={1.75} />
              RECOVERY · {isToday ? "TODAY" : formatDayShort(selectedKey)}
            </CardLabel>
            <Gauge
              value={recovery?.score ?? 0}
              max={100}
              size={140}
              unit="%"
              label={recovery?.date ? formatDayShort(recovery.date) : "—"}
              accentByValue
            />
            <div className="grid grid-cols-2 gap-3 w-full pt-2 border-t border-[color:var(--border)] mt-auto">
              <MonoStat
                label="HRV"
                value={recovery?.hrvMs ? Number(recovery.hrvMs).toFixed(0) : "—"}
                unit="ms"
                icon={<Activity size={12} strokeWidth={1.75} />}
              />
              <MonoStat
                label="RHR"
                value={recovery?.rhr ?? "—"}
                unit="bpm"
                icon={<HeartPulse size={12} strokeWidth={1.75} />}
              />
            </div>
          </Card>
        )}

        <MacroBlock
          protein={totalP}
          carbs={totalC}
          fat={totalF}
          kcal={totalKcal}
          kcalTarget={kcalTarget}
          proteinTarget={macroTargets?.proteinG ?? null}
          carbsTarget={macroTargets?.carbsG ?? null}
          fatTarget={macroTargets?.fatG ?? null}
        />
      </section>

      {!whoopConnected && (
        <Link
          href="/whoop"
          className="block border border-dashed border-[color:var(--border-visible)] px-4 py-3 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
        >
          CONNECT WHOOP TO UNLOCK RECOVERY · STRAIN · SLEEP · MEASURED TDEE →
        </Link>
      )}

      <section>
        <WeightProjection
          sex={sex}
          heightCm={heightCm}
          age={age}
          activity={activity}
          startWeightKg={weightKg}
          dailyKcalIntake={kcalTarget}
          goalWeightKg={prof?.targetWeightKg ? Number(prof.targetWeightKg) : null}
        />
      </section>

      <section>
        <Card>
          <CardLabel>LAST WORKOUT</CardLabel>
          {lastWorkout ? (
            <div>
              <div className="font-display text-2xl">
                {new Date(lastWorkout.startedAt).toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "short",
                })}
              </div>
              <div className="mono-label mt-1">
                {lastWorkout.endedAt ? "COMPLETED" : "IN PROGRESS"}
              </div>
              <Link
                href={`/workouts/${lastWorkout.id}`}
                className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--accent)] mt-3 inline-block"
              >
                OPEN →
              </Link>
            </div>
          ) : (
            <div className="font-mono text-sm text-[color:var(--text-secondary)]">
              no workouts yet —{" "}
              <Link href="/workouts/new" className="text-[color:var(--accent)]">
                start one
              </Link>
            </div>
          )}
        </Card>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { href: "/workouts/new", label: "START WORKOUT" },
          { href: "/food/new", label: "LOG MEAL" },
          { href: "/food/plan", label: "GENERATE PLAN" },
          { href: "/analysis", label: "ANALYSIS" },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="border border-[color:var(--border-visible)] py-4 px-3 text-center font-mono text-[11px] uppercase tracking-[0.1em] hover:border-[color:var(--text-display)] hover:text-[color:var(--text-display)] text-[color:var(--text-secondary)]"
          >
            {a.label} →
          </Link>
        ))}
      </section>
    </div>
  );
}
