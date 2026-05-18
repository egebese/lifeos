"use client";

import {
  CartesianGrid,
  Line,
  LineChart as RLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function LineChart({
  data,
  xKey,
  yKey,
  height = 200,
  color,
}: {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  height?: number;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RLineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 2" />
        <XAxis
          dataKey={xKey}
          tick={{ fill: "var(--text-secondary)", fontSize: 10, fontFamily: "var(--font-mono)" }}
          stroke="var(--border-visible)"
        />
        <YAxis
          tick={{ fill: "var(--text-secondary)", fontSize: 10, fontFamily: "var(--font-mono)" }}
          stroke="var(--border-visible)"
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border-visible)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
          labelStyle={{ color: "var(--text-secondary)" }}
        />
        <Line
          type="monotone"
          dataKey={yKey}
          stroke={color ?? "var(--text-display)"}
          strokeWidth={1.5}
          dot={false}
        />
      </RLineChart>
    </ResponsiveContainer>
  );
}
