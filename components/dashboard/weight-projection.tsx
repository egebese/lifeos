"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Target } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { LineChart } from "@/components/charts/line-chart";
import { projectWeight, weeksToTarget } from "@/lib/nutrition/projection";
import type { Activity, Sex } from "@/lib/nutrition";

type Props = {
  sex: Sex;
  heightCm: number;
  age: number;
  activity: Activity;
  startWeightKg: number;
  dailyKcalIntake: number;
  goalWeightKg?: number | null;
};

const HORIZONS = [
  { label: "8W", weeks: 8 },
  { label: "26W", weeks: 26 },
  { label: "52W", weeks: 52 },
];

export function WeightProjection(props: Props) {
  const [weeks, setWeeks] = useState(8);

  const ok =
    props.heightCm > 0 &&
    props.age > 0 &&
    props.startWeightKg > 0 &&
    props.dailyKcalIntake > 0;

  const points = useMemo(() => {
    if (!ok) return [];
    return projectWeight({
      sex: props.sex,
      heightCm: props.heightCm,
      age: props.age,
      activity: props.activity,
      startWeightKg: props.startWeightKg,
      dailyKcalIntake: props.dailyKcalIntake,
      weeks,
    });
  }, [
    ok,
    props.sex,
    props.heightCm,
    props.age,
    props.activity,
    props.startWeightKg,
    props.dailyKcalIntake,
    weeks,
  ]);

  if (!ok) {
    return (
      <Card>
        <CardLabel className="flex items-center gap-1.5">
          <TrendingDown size={12} strokeWidth={1.75} />
          WEIGHT PROJECTION
        </CardLabel>
        <div className="font-mono text-sm text-[color:var(--text-secondary)]">
          Set profile (sex, height, age, weight) + a daily kcal target to see the projection.
        </div>
      </Card>
    );
  }

  const end = points[points.length - 1];
  const delta = end.weightKg - points[0].weightKg;
  const direction = delta < 0 ? "down" : delta > 0 ? "up" : "flat";
  const chartData = points.map((p) => ({
    label: p.week === 0 ? "NOW" : `W${p.week}`,
    weight: p.weightKg,
  }));

  const targetWeeks =
    props.goalWeightKg && props.goalWeightKg > 0
      ? weeksToTarget(points, props.goalWeightKg)
      : null;

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <CardLabel className="flex items-center gap-1.5 mb-0">
          {direction === "down" ? (
            <TrendingDown size={12} strokeWidth={1.75} />
          ) : (
            <TrendingUp size={12} strokeWidth={1.75} />
          )}
          WEIGHT PROJECTION · {props.dailyKcalIntake} KCAL/DAY
        </CardLabel>
        <div className="flex gap-1">
          {HORIZONS.map((h) => (
            <button
              key={h.weeks}
              onClick={() => setWeeks(h.weeks)}
              className={`font-mono text-[10px] uppercase tracking-[0.08em] px-2 py-1 border ${
                weeks === h.weeks
                  ? "border-[color:var(--text-display)] text-[color:var(--text-display)]"
                  : "border-[color:var(--border-visible)] text-[color:var(--text-secondary)]"
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
            NOW
          </div>
          <div className="font-display text-2xl">{points[0].weightKg.toFixed(1)}</div>
          <div className="font-mono text-[10px] text-[color:var(--text-secondary)]">kg</div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
            IN {weeks}W
          </div>
          <div className="font-display text-2xl">{end.weightKg.toFixed(1)}</div>
          <div className="font-mono text-[10px] text-[color:var(--text-secondary)]">
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)} kg
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
            DEFICIT
          </div>
          <div className="font-display text-2xl">
            {Math.round(points[0].dailyDeficitKcal)}
          </div>
          <div className="font-mono text-[10px] text-[color:var(--text-secondary)]">
            kcal/day
          </div>
        </div>
      </div>

      <LineChart
        data={chartData}
        xKey="label"
        yKey="weight"
        height={180}
        color={
          direction === "down"
            ? "var(--success)"
            : direction === "up"
              ? "var(--warning)"
              : "var(--text-display)"
        }
      />

      {targetWeeks != null && props.goalWeightKg && (
        <div className="mt-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[color:var(--accent)] border-t border-[color:var(--border)] pt-3">
          <Target size={12} strokeWidth={1.75} />
          {props.goalWeightKg.toFixed(1)} kg target reached at week {targetWeeks}
        </div>
      )}
      {targetWeeks == null && props.goalWeightKg && props.goalWeightKg > 0 && (
        <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] border-t border-[color:var(--border)] pt-3">
          target {props.goalWeightKg.toFixed(1)} kg not reached within {weeks} weeks
        </div>
      )}
    </Card>
  );
}
