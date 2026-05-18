"use client";

import { useState } from "react";
import { Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type Meal = "breakfast" | "lunch" | "dinner" | "snack";

const MEAL_OPTIONS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export function AiMealForm() {
  const [defaultMeal, setDefaultMeal] = useState<Meal>("breakfast");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  function tryAi() {
    setStatus(
      "Demo: this feature uses fal.ai (Claude Sonnet + Whisper) in the self-hosted version. Try the manual form below, or check github.com/egebese/lifeos to run it for real.",
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles
          size={16}
          strokeWidth={1.5}
          className="text-[color:var(--accent)]"
        />
        <div className="mono-label">AI · AUTOLOG</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
        <div>
          <div className="mono-label mb-1">DEFAULT MEAL</div>
          <Select
            value={defaultMeal}
            onChange={(e) => setDefaultMeal(e.target.value as Meal)}
          >
            {MEAL_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <div className="mono-label mb-1">DESCRIBE</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder='e.g. "for breakfast: a lavash wrap with 1 boiled egg, half an avocado and yogurt-lemon sauce, plus an extra boiled egg, some greens, a matchbox of white cheese, 3 black olives"'
            className="w-full bg-transparent border-b border-[color:var(--border-visible)] py-2 font-body text-base text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)] resize-none placeholder:text-[color:var(--text-disabled)]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={tryAi}
          className="btn btn--outline btn--sm"
        >
          <Mic size={14} strokeWidth={1.5} className="mr-2" />
          RECORD VOICE
        </button>
        <Button
          type="button"
          variant="accent"
          onClick={tryAi}
        >
          PARSE WITH AI →
        </Button>
      </div>

      {status && (
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] leading-relaxed">
          {status}
        </div>
      )}
    </div>
  );
}
