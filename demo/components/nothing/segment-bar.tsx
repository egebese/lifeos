"use client";

export function SegmentBar({
  value,
  max = 100,
  segments = 20,
  color,
}: {
  value: number;
  max?: number;
  segments?: number;
  color?: string;
}) {
  const filled = Math.max(0, Math.min(segments, Math.round((value / max) * segments)));
  return (
    <div className="flex gap-[2px] w-full">
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-2"
          style={{
            background:
              i < filled
                ? color ?? "var(--text-display)"
                : "var(--border-visible)",
          }}
        />
      ))}
    </div>
  );
}
