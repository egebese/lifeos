"use client";

import { useState } from "react";
import { Card, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Insights = {
  summary: string;
  highlights: string[];
  warnings: string[];
  recommendations: string[];
};

export function WeeklyInsights() {
  const [data, setData] = useState<Insights | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function gen() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/insights/weekly", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? `http_${r.status}`);
      setData(j.insights as Insights);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <CardLabel>AI · WEEKLY SUMMARY</CardLabel>
        <Button variant="outline" onClick={gen} disabled={busy}>
          {busy ? "ANALYZING…" : "GENERATE →"}
        </Button>
      </div>
      {error && <div className="font-mono text-[11px] text-[color:var(--accent)]">{error}</div>}
      {data ? (
        <div className="space-y-3 mt-2">
          <p className="font-body text-[color:var(--text-display)]">{data.summary}</p>
          {data.highlights.length > 0 && (
            <div>
              <div className="mono-label mb-1">HIGHLIGHTS</div>
              <ul className="text-sm space-y-1">
                {data.highlights.map((h, i) => (
                  <li key={i}>· {h}</li>
                ))}
              </ul>
            </div>
          )}
          {data.warnings.length > 0 && (
            <div>
              <div className="mono-label mb-1 text-[color:var(--warning)]">WARNINGS</div>
              <ul className="text-sm space-y-1">
                {data.warnings.map((h, i) => (
                  <li key={i}>· {h}</li>
                ))}
              </ul>
            </div>
          )}
          {data.recommendations.length > 0 && (
            <div>
              <div className="mono-label mb-1 text-[color:var(--accent)]">RECOMMENDATIONS</div>
              <ul className="text-sm space-y-1">
                {data.recommendations.map((h, i) => (
                  <li key={i}>· {h}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="font-mono text-sm text-[color:var(--text-secondary)]">
          Click GENERATE to get a Sonnet-powered review of the last 7 days.
        </div>
      )}
    </Card>
  );
}
