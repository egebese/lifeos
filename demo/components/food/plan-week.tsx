"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Coffee,
  Cookie,
  Soup,
  UtensilsCrossed,
} from "lucide-react";

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

type Props = {
  days: DayPlan[];
  todayKey: string; // YYYY-MM-DD local
};

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function parts(ymd: string): { dayName: string; dayLong: string; dom: string; mon: string } {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dayIdx = dt.getDay();
  return {
    dayName: DAY_NAMES[dayIdx],
    dayLong: DAY_LONG[dayIdx],
    dom: String(d).padStart(2, "0"),
    mon: dt.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
  };
}

const MEAL_META = [
  { key: "breakfast" as const, label: "BREAKFAST", Icon: Coffee },
  { key: "lunch" as const, label: "LUNCH", Icon: UtensilsCrossed },
  { key: "dinner" as const, label: "DINNER", Icon: Soup },
  { key: "snacks" as const, label: "SNACKS", Icon: Cookie },
];

export function PlanWeek({ days, todayKey }: Props) {
  // Today expanded by default; if today isn't in the plan window, expand first day.
  const initialOpen =
    days.find((d) => d.date === todayKey)?.date ?? days[0]?.date ?? null;
  const [openKey, setOpenKey] = useState<string | null>(initialOpen);

  return (
    <div className="space-y-2">
      {days.map((d) => {
        const isToday = d.date === todayKey;
        const isOpen = openKey === d.date;
        const p = parts(d.date);
        return (
          <div
            key={d.date}
            className={`border ${
              isToday ? "border-[color:var(--accent)]" : "border-[color:var(--border)]"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenKey(isOpen ? null : d.date)}
              className="w-full px-3 py-3 flex items-center gap-3 hover:bg-[color:var(--border)]"
            >
              <div className="flex flex-col items-center justify-center w-12 shrink-0">
                <span
                  className={`font-mono text-[10px] uppercase tracking-[0.1em] ${
                    isToday
                      ? "text-[color:var(--accent)]"
                      : "text-[color:var(--text-secondary)]"
                  }`}
                >
                  {p.dayName}
                </span>
                <span className="font-display text-2xl leading-none text-[color:var(--text-display)]">
                  {p.dom}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[color:var(--text-disabled)]">
                  {p.mon}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="font-display text-lg text-[color:var(--text-display)]">
                  {p.dayLong}
                  {isToday && (
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--accent)] align-middle">
                      · TODAY
                    </span>
                  )}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
                  {d.totals
                    ? `${Math.round(d.totals.kcal)} KCAL · P${Math.round(
                        d.totals.protein_g,
                      )} · C${Math.round(d.totals.carbs_g)} · F${Math.round(
                        d.totals.fat_g,
                      )}`
                    : "—"}
                </div>
              </div>
              {isOpen ? (
                <ChevronUp size={14} strokeWidth={1.5} className="text-[color:var(--text-secondary)]" />
              ) : (
                <ChevronDown size={14} strokeWidth={1.5} className="text-[color:var(--text-secondary)]" />
              )}
            </button>

            {isOpen && (
              <div className="border-t border-[color:var(--border)] px-3 py-3 space-y-4">
                {MEAL_META.map(({ key, label, Icon }) => {
                  const meals = d[key];
                  if (!meals || meals.length === 0) return null;
                  return (
                    <div key={key}>
                      <div className="flex items-center gap-1.5 mono-label mb-2">
                        <Icon size={11} strokeWidth={1.75} />
                        {label}
                      </div>
                      <ul className="space-y-2">
                        {meals.map((it, i) => (
                          <li
                            key={i}
                            className="grid grid-cols-[1fr_auto] gap-3 items-start py-1.5 border-b border-[color:var(--border)] last:border-b-0"
                          >
                            <div className="min-w-0">
                              <div className="font-body text-sm text-[color:var(--text-display)]">
                                {it.name}
                              </div>
                              {it.portion && (
                                <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-[color:var(--accent)] mt-0.5">
                                  {it.portion}
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-mono text-sm text-[color:var(--text-display)] tabular-nums">
                                {Math.round(it.kcal)}
                                <span className="text-[color:var(--text-secondary)] text-[10px] ml-1">
                                  kcal
                                </span>
                              </div>
                              <div className="font-mono text-[10px] text-[color:var(--text-secondary)] tabular-nums">
                                P{Math.round(it.protein_g)} · C{Math.round(it.carbs_g)} · F
                                {Math.round(it.fat_g)}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
