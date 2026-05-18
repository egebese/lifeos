import { cn } from "@/lib/utils";

export function Ticker({ items, className }: { items: { label: string; value: string }[]; className?: string }) {
  return (
    <div
      className={cn(
        "flex gap-6 overflow-x-auto py-2 px-1 border-b border-[color:var(--border)] -mx-4 px-4 scrollbar-hide",
        className,
      )}
    >
      {items.map((it, i) => (
        <div key={i} className="flex-shrink-0 flex items-baseline gap-2">
          <span className="mono-label">{it.label}</span>
          <span className="font-mono text-sm text-[color:var(--text-display)] tabular-nums">{it.value}</span>
        </div>
      ))}
    </div>
  );
}
