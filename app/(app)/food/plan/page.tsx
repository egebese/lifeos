import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mealPlans, shoppingLists } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { Card, CardLabel } from "@/components/ui/card";
import { GeneratePlanForm } from "./generate-plan-form";

export const dynamic = "force-dynamic";

type MealItem = { name: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number };
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

export default async function MealPlanPage() {
  const { user } = await requireSession();
  const [latest] = await db
    .select()
    .from(mealPlans)
    .where(eq(mealPlans.userId, user.id))
    .orderBy(desc(mealPlans.createdAt))
    .limit(1);

  const list = latest
    ? await db
        .select()
        .from(shoppingLists)
        .where(eq(shoppingLists.mealPlanId, latest.id))
        .limit(1)
    : [];

  const plan = (latest?.plan ?? null) as PlanShape | null;
  const items = (list[0]?.items ?? []) as Array<{
    name: string;
    qty?: number;
    unit?: string;
    aisle?: string;
  }>;

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
          <Card>
            <div className="flex items-baseline justify-between mb-4">
              <CardLabel>WEEK · {plan.starts_on} → {plan.ends_on}</CardLabel>
            </div>
            <div className="space-y-4">
              {plan.days.map((d) => (
                <div key={d.date} className="border-t border-[color:var(--border)] pt-3">
                  <div className="font-mono text-sm text-[color:var(--text-display)] mb-2">{d.date}</div>
                  {(["breakfast", "lunch", "dinner", "snacks"] as const).map((m) => {
                    const meals = d[m];
                    if (!meals || meals.length === 0) return null;
                    return (
                      <div key={m} className="mb-2">
                        <div className="mono-label mb-1">{m.toUpperCase()}</div>
                        <ul className="space-y-0.5">
                          {meals.map((it, i) => (
                            <li key={i} className="flex justify-between text-sm">
                              <span className="font-body text-[color:var(--text-primary)]">{it.name}</span>
                              <span className="font-mono text-[11px] text-[color:var(--text-secondary)]">
                                {Math.round(it.kcal)} kcal · P{Math.round(it.protein_g)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  {d.totals && (
                    <div className="mono-label mt-2">
                      TOTAL {Math.round(d.totals.kcal)} kcal · P {Math.round(d.totals.protein_g)}g · C {Math.round(d.totals.carbs_g)}g · F {Math.round(d.totals.fat_g)}g
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardLabel>SHOPPING LIST</CardLabel>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 mt-2">
              {items.map((it, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[1fr_auto] gap-2 py-2 border-b border-[color:var(--border)]"
                >
                  <span className="font-body text-sm">{it.name}</span>
                  <span className="font-mono text-[11px] text-[color:var(--text-secondary)]">
                    {it.qty ?? ""} {it.unit ?? ""} {it.aisle ? `· ${it.aisle}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
