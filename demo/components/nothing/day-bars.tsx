import { cn } from "@/lib/utils";

export type DayPoint = {
  date: string; // YYYY-MM-DD
  value: number | null;
};

type Mode = "score" | "value";

// A 30-day strip of vertical bars. Bar height is proportional to value/max.
// Color mode "score" treats value as 0-100 (recovery-style green/yellow/red);
// "value" uses a single accent for any positive value.
export function DayBars({
  days,
  max,
  mode = "value",
  height = 56,
  className,
  unit,
}: {
  days: DayPoint[];
  max?: number;
  mode?: Mode;
  height?: number;
  className?: string;
  unit?: string;
}) {
  const numericMax =
    max ??
    days.reduce((acc, d) => (d.value != null && d.value > acc ? d.value : acc), 0);
  const safeMax = numericMax > 0 ? numericMax : 1;

  return (
    <div className={cn("w-full", className)}>
      <div
        className="flex items-end gap-[2px] w-full"
        style={{ height }}
        aria-label="daily values"
      >
        {days.map((d, i) => {
          const v = d.value;
          const has = v != null && !Number.isNaN(v);
          const pct = has ? Math.min(1, Math.max(0, (v as number) / safeMax)) : 0;
          const h = has ? Math.max(2, Math.round(pct * height)) : 1;
          const color = !has
            ? "var(--border)"
            : mode === "score"
              ? (v as number) >= 67
                ? "var(--success)"
                : (v as number) >= 34
                  ? "var(--warning)"
                  : "var(--accent)"
              : "var(--text-display)";
          const title = `${d.date}${has ? ` — ${(v as number).toFixed(1)}${unit ?? ""}` : ""}`;
          return (
            <div
              key={`${d.date}-${i}`}
              title={title}
              className="flex-1 transition-colors"
              style={{ height: h, background: color, minWidth: 2 }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-2 font-mono text-[9px] tracking-[0.06em] text-[color:var(--text-disabled)] uppercase">
        <span>{days[0]?.date.slice(5) ?? ""}</span>
        <span>{days[days.length - 1]?.date.slice(5) ?? ""}</span>
      </div>
    </div>
  );
}
