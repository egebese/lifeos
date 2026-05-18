"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type Goal = "strength" | "hypertrophy" | "fat_loss" | "general" | "endurance";
type Level = "beginner" | "intermediate" | "advanced";

const EQUIPMENT = [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "kettlebell",
  "bodyweight",
  "bands",
];

export function AiProgramForm() {
  const [goal, setGoal] = useState<Goal>("hypertrophy");
  const [level, setLevel] = useState<Level>("intermediate");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [sessionMinutes, setSessionMinutes] = useState(60);
  const [equipment, setEquipment] = useState<string[]>([
    "barbell",
    "dumbbell",
    "cable",
    "machine",
  ]);
  const [focus, setFocus] = useState("");
  const [injuries, setInjuries] = useState("");

  const [status, setStatus] = useState<string | null>(null);

  function toggleEquipment(item: string) {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );
  }

  function generate(e: React.FormEvent) {
    e.preventDefault();
    setStatus(
      "Demo: AI program generation runs Claude Sonnet via fal.ai in the self-hosted version. Use the manual form below, or check github.com/egebese/lifeos.",
    );
  }

  return (
    <form onSubmit={generate} className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles size={16} strokeWidth={1.5} className="text-[color:var(--accent)]" />
        <div className="mono-label">AI · AUTOPILOT</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div className="mono-label mb-1">GOAL</div>
          <Select
            value={goal}
            onChange={(e) => setGoal(e.target.value as Goal)}
          >
            <option value="strength">strength</option>
            <option value="hypertrophy">hypertrophy (muscle)</option>
            <option value="fat_loss">fat loss</option>
            <option value="endurance">endurance</option>
            <option value="general">general fitness</option>
          </Select>
        </div>
        <div>
          <div className="mono-label mb-1">EXPERIENCE</div>
          <Select
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
          >
            <option value="beginner">beginner ( &lt; 1y )</option>
            <option value="intermediate">intermediate ( 1-3y )</option>
            <option value="advanced">advanced ( 3y+ )</option>
          </Select>
        </div>
        <div>
          <div className="mono-label mb-1">DAYS / WEEK</div>
          <Select
            value={String(daysPerWeek)}
            onChange={(e) => setDaysPerWeek(Number(e.target.value))}
          >
            {[2, 3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <div className="mono-label mb-1">SESSION LENGTH</div>
          <Select
            value={String(sessionMinutes)}
            onChange={(e) => setSessionMinutes(Number(e.target.value))}
          >
            {[30, 45, 60, 75, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <div className="mono-label mb-2">EQUIPMENT</div>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((item) => {
            const active = equipment.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleEquipment(item)}
                className={active ? "chip chip--active" : "chip"}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mono-label mb-1">FOCUS / NOTES (optional)</div>
        <textarea
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          rows={2}
          placeholder="e.g. emphasize back & posterior chain, prefer compound lifts"
          className="w-full bg-transparent border-b border-[color:var(--border-visible)] py-2 font-body text-base text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)] resize-none placeholder:text-[color:var(--text-disabled)]"
        />
      </div>

      <div>
        <div className="mono-label mb-1">INJURIES / LIMITS (optional)</div>
        <textarea
          value={injuries}
          onChange={(e) => setInjuries(e.target.value)}
          rows={2}
          placeholder="e.g. no overhead pressing, sensitive lower back"
          className="w-full bg-transparent border-b border-[color:var(--border-visible)] py-2 font-body text-base text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)] resize-none placeholder:text-[color:var(--text-disabled)]"
        />
      </div>

      {status && (
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] leading-relaxed">
          → {status}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="submit" variant="accent" disabled={equipment.length === 0}>
          GENERATE PROGRAM →
        </Button>
      </div>
    </form>
  );
}
