"use client";

import { useDemoStore } from "@/lib/demo/store";
import { Card, CardLabel } from "@/components/ui/card";
import { GeneratePlanForm } from "./generate-plan-form";
import { HandMeasureLegend } from "@/components/food/hand-measure-legend";
import { PlanWeek } from "@/components/food/plan-week";
import { ShoppingChecklist } from "@/components/food/shopping-checklist";

type MealItem = {
  name: string;
  portion?: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};
type DayPlan = {
  date: string;
  breakfast: MealItem[];
  lunch: MealItem[];
  dinner: MealItem[];
  snacks: MealItem[];
  totals?: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
};
type PlanShape = {
  starts_on: string;
  ends_on: string;
  days: DayPlan[];
};

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function rangeLabel(starts: string, ends: string): string {
  const fmt = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt
      .toLocaleDateString("en-US", { day: "2-digit", month: "short" })
      .toUpperCase();
  };
  return `${fmt(starts)} → ${fmt(ends)}`;
}

export default function MealPlanPage() {
  const { state } = useDemoStore();

  const latest = [...state.mealPlans].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  )[0];
  const list = latest
    ? state.shoppingLists.filter((s) => s.mealPlanId === latest.id)
    : [];

  const plan = (latest?.plan ?? null) as PlanShape | null;
  const shoppingRow = list[0];
  const todayKey = ymdLocal(new Date());

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">AI · MEAL PLANNER</div>
        <h1 className="font-display text-4xl mt-1">diet plan</h1>
      </header>

      <Card>
        <CardLabel>GENERATE</CardLabel>
        <GeneratePlanForm />
      </Card>

      {plan && (
        <>
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <div className="mono-label">WEEK · {rangeLabel(plan.starts_on, plan.ends_on)}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-disabled)]">
                {plan.days.length} DAY{plan.days.length === 1 ? "" : "S"}
              </div>
            </div>
            <PlanWeek days={plan.days} todayKey={todayKey} />
          </div>

          <HandMeasureLegend />

          {shoppingRow && (
            <Card>
              <CardLabel>SHOPPING LIST</CardLabel>
              <div className="mt-3">
                <ShoppingChecklist shoppingListId={shoppingRow.id} />
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
