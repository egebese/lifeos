"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function GeneratePlanForm() {
  const router = useRouter();
  const [days, setDays] = useState("7");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function gen() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ days: Number(days) }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? `http_${r.status}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-end gap-3">
        <div>
          <div className="mono-label mb-1">DAYS</div>
          <Select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="3">3 days</option>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
          </Select>
        </div>
        <Button onClick={gen} disabled={busy} variant="accent">
          {busy ? "GENERATING…" : "GENERATE →"}
        </Button>
      </div>
      {error && <div className="font-mono text-[11px] text-[color:var(--accent)]">{error}</div>}
      <div className="font-mono text-[11px] text-[color:var(--text-disabled)]">
        Uses profile goal + preferences + pantry. Sonnet 4.6 via fal openrouter.
      </div>
    </div>
  );
}
