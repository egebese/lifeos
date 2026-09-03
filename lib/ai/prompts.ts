// Prompt builders. Each returns { system, prompt } strings for the local
// OpenAI-compatible endpoint.

export type Prompt = { system: string; prompt: string };

export function foodVisionPrompt(_locale: "tr" | "en" = "en"): Prompt {
  // UI is English-only; always reply in English regardless of locale arg.
  const system =
    "You are a nutritionist. Look at the food photo and estimate calories and macros. Return ONLY valid JSON, no prose, no markdown.";

  const prompt = `Estimate this dish and return JSON:
{
  "name": "concise English dish name",
  "kcal": <total>,
  "protein_g": <g>,
  "carbs_g": <g>,
  "fat_g": <g>,
  "confidence": <0..1>,
  "notes": "English assumptions"
}
If portion unclear, assume a typical single serving. JSON only.`;

  return { system, prompt };
}

export type PlanInput = {
  locale: "tr" | "en";
  goal: "cut" | "maintain" | "bulk";
  targetKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  liked: string[];
  disliked: string[];
  allergies: string[];
  pantry: { name: string; qty?: number | null; unit?: string | null }[];
  recentMeals: string[];
  daysCount: number;
};

export function weeklyPlanPrompt(p: PlanInput): Prompt {
  // UI is English-only — always respond with English meal names regardless of
  // p.locale (kept for API stability).
  void p.locale;
  const system = `You are a dietitian crafting weekly meal plans for a Turkish user. Return ONLY a single valid JSON object — no prose, no markdown. Use English meal and ingredient names, but write the per-item PORTION string in a Turkish hand-measure ("el ölçüsü") idiom plus a grams/adet fallback.

Hand-measure cheatsheet (use these when describing portions):
- Avuç içi (palm of hand): ~100-150 g of meat/fish/poultry
- Yumruk (closed fist): ~1 cup / ~150-200 g cooked rice, pasta, beans, or fruit
- Sıkılı yumruğun ön tarafı (front of fist): ~½ cup
- Sıkılı yumruğun iç tarafı (inside of fist): ~1 full glass volume
- Baş parmak ucu (thumb tip): ~½ tablespoon = ~7 g of oil/peanut butter/cheese
- İşaret parmak ucu (index fingertip): ~1 teaspoon = ~5 g
- 1 kibrit kutusu peynir (matchbox of cheese): ~30 g
- 1 dilim ekmek (slice of bread): ~25-35 g
- 1 lavaş: ~40-60 g flatbread
- 1 orta boy yumurta: ~50 g
- 1 avuç fındık/badem (handful of nuts): ~30 g`;

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Goal: ${p.goal} (~${p.targetKcal} kcal/day)
Macros target: protein ${p.proteinG}g, carbs ${p.carbsG}g, fat ${p.fatG}g.
Liked: ${p.liked.join(", ") || "-"}
Disliked: ${p.disliked.join(", ") || "-"}
Allergies: ${p.allergies.join(", ") || "-"}
Pantry on hand: ${
    p.pantry
      .map((x) => `${x.name}${x.qty ? ` (${x.qty}${x.unit ?? ""})` : ""}`)
      .join(", ") || "empty"
  }
Recently eaten (avoid repeating heavily): ${
    p.recentMeals.slice(0, 20).join(", ") || "-"
  }

Generate a ${p.daysCount}-day meal plan starting ${today}. Each day MUST be close to the kcal & macro targets.
Use pantry items first; minimize new shopping items.

Every meal item MUST include a "portion" string that uses Turkish hand-measure idioms PLUS a grams/adet fallback so the user can prepare it without a scale. Examples:
  - "1 avuç içi (~150 g)"
  - "1 yumruk pirinç (~180 g pişmiş)"
  - "2 yemek kaşığı zeytinyağı (~25 g)"
  - "1 baş parmak ucu fıstık ezmesi (~7 g)"
  - "1 kibrit kutusu beyaz peynir (~30 g)"
  - "2 orta boy yumurta (~100 g)"

Return JSON exactly:
{
  "starts_on": "YYYY-MM-DD",
  "ends_on": "YYYY-MM-DD",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "breakfast": [{ "name": "...", "portion": "Turkish hand-measure idiom + (~g)", "kcal": N, "protein_g": N, "carbs_g": N, "fat_g": N, "ingredients": [{"name":"...","qty":N,"unit":"g|ml|adet"}] }],
      "lunch": [...],
      "dinner": [...],
      "snacks": [...],
      "totals": { "kcal": N, "protein_g": N, "carbs_g": N, "fat_g": N }
    }
  ],
  "shopping_list": [{ "name": "...", "qty": N, "unit": "g|ml|adet", "aisle": "produce|meat|dairy|pantry|frozen|other" }]
}

Subtract pantry quantities from shopping_list so it represents what STILL needs to be bought.
Output ONLY the JSON object. No \`\`\` fences, no commentary.`;

  return { system, prompt };
}

export type InsightsInput = {
  locale: "tr" | "en";
  weekStart: string;
  weekEnd: string;
  kcalTarget: number;
  dailyKcal: number[];
  proteinDaily: number[];
  workoutCount: number;
  workoutVolumeKg: number;
  recoveryScores: number[];
  sleepHours: number[];
  bodyWeightStart?: number | null;
  bodyWeightEnd?: number | null;
  goal: "cut" | "maintain" | "bulk";
};

export type ProgramInput = {
  locale: "tr" | "en";
  goal: "strength" | "hypertrophy" | "fat_loss" | "general" | "endurance";
  level: "beginner" | "intermediate" | "advanced";
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: string[];
  focus?: string;
  injuries?: string;
  recoveryAvg?: number | null;
  sleepAvgHours?: number | null;
};

const BODY_PARTS = [
  "chest",
  "back",
  "shoulders",
  "upper arms",
  "lower arms",
  "upper legs",
  "lower legs",
  "waist",
  "cardio",
  "neck",
];

export function programGeneratorPrompt(p: ProgramInput): Prompt {
  const system =
    p.locale === "tr"
      ? "Sen lisanslı bir kuvvet & kondisyon koçusun. Kullanıcının hedefi, deneyimi ve ekipmanına göre haftalık bir antrenman programı kur. SADECE tek bir geçerli JSON objesi döndür — Markdown veya açıklama yazma. Egzersiz isimlerini İngilizce olarak ver (ör. 'barbell bench press') ki sistem onları egzersiz veri tabanıyla eşleştirebilsin."
      : "You are a certified strength & conditioning coach. Build a weekly training program tailored to the user's goal, experience and equipment. Return ONLY a single valid JSON object — no markdown, no prose. Use English exercise names (e.g. 'barbell bench press') so the system can match them to the exercise database.";

  const prompt = `Goal: ${p.goal}
Experience level: ${p.level}
Days per week: ${p.daysPerWeek}
Session length: ~${p.sessionMinutes} min
Equipment available: ${p.equipment.length ? p.equipment.join(", ") : "full commercial gym"}
${p.focus ? `Focus / preferences: ${p.focus}` : ""}
${p.injuries ? `Injuries / contraindications: ${p.injuries}` : ""}
${p.recoveryAvg != null ? `Recent recovery avg (Whoop, 0-100): ${p.recoveryAvg}` : ""}
${p.sleepAvgHours != null ? `Recent sleep avg: ${p.sleepAvgHours.toFixed(1)}h` : ""}

Design exactly ${p.daysPerWeek} training day(s) per week.
Each day must have between 4 and 8 exercises, sequenced from compound to isolation.
Set/rep prescription must match the goal:
  - strength: 3-5 sets × 3-6 reps for big lifts, 8-12 reps for accessories
  - hypertrophy: 3-4 sets × 6-12 reps
  - fat_loss: 3-4 sets × 10-15 reps, short rest
  - endurance: 2-3 sets × 12-20 reps
  - general: 3 sets × 8-12 reps

Return JSON exactly:
{
  "name": "concise program name",
  "description": "1-3 sentence overview, including weekly split logic.",
  "days": [
    {
      "name": "Day 1 — <focus>",
      "focus": "push | pull | legs | upper | lower | full | …",
      "exercises": [
        {
          "search": "english exercise name (lowercase), e.g. 'barbell back squat'",
          "body_part": "one of: ${BODY_PARTS.join(" | ")}",
          "equipment": "e.g. barbell, dumbbell, cable, bodyweight, machine",
          "sets": <int>,
          "reps": <int>,
          "rest_seconds": <int 30-300>,
          "notes": "form cue or progression hint (optional, brief)"
        }
      ]
    }
  ]
}

Output ONLY the JSON. No \`\`\` fences, no commentary.`;

  return { system, prompt };
}

export type MealParserInput = {
  locale: "tr" | "en";
  text: string;
  nowIso: string;
  defaultMeal?: "breakfast" | "lunch" | "dinner" | "snack";
};

export function mealParserPrompt(p: MealParserInput): Prompt {
  // UI is English — always respond in English even when the user types or
  // speaks Turkish. The system prompt below carries Turkish portion idioms
  // so we can still parse "1 kibrit kutusu peynir", but item names + notes
  // come back in English.
  const system = `You are a personal nutrition assistant. Carefully analyze the user's free-form meal description (which may be in English or Turkish) and estimate the calories + macros for each item.

Portion idioms you should recognize:
- "matchbox of cheese" / "1 kibrit kutusu peynir" ≈ 30 g
- "palm of meat" / "1 yumruk et" ≈ 100-150 g
- "handful" / "1 avuç" ≈ 30-40 g (nuts ~30 g)
- "tablespoon of oil" / "1 yemek kaşığı yağ" ≈ 12-15 g
- "slice of bread" / "1 dilim ekmek" ≈ 25-35 g
- "lavash" / "1 lavaş" ≈ 40-60 g flatbread
- "medium egg" / "1 orta boy yumurta" ≈ 50 g

For composed dishes ("wrap with egg, avocado, sauce" / "lavaş içinde yumurta, avokado, sos") combine ALL ingredients into ONE item. Items explicitly tagged as "extra" / "plus" / "ek olarak" / "yanında" become separate items.

When unsure about portion sizes, brand calories, or unfamiliar foods, search the web. Always output English item names and notes regardless of the input language. Return ONLY valid JSON — no prose, no markdown.`;

  const today = p.nowIso.slice(0, 10);
  const hint = p.defaultMeal ? `Default meal slot if not specified: ${p.defaultMeal}.` : "";

  const prompt = `Today: ${today}
${hint}
User input:
"""
${p.text.trim()}
"""

Detect meal slot from words like "breakfast/kahvaltı", "lunch/öğle", "dinner/akşam", "snack/ara öğün" — otherwise default to ${p.defaultMeal ?? "snack"}.

Parse into items. For composed dishes, combine ingredients into a single item; otherwise split out anything labeled "extra"/"plus"/"ek olarak"/"yanında".

Return JSON exactly:
{
  "meal": "breakfast" | "lunch" | "dinner" | "snack",
  "items": [
    {
      "name": "concise English dish name",
      "quantity": "human-readable English portion summary, e.g. '1 wrap (lavash + egg + ½ avocado + yogurt-lemon sauce)'",
      "kcal": <total kcal, integer>,
      "protein_g": <g>,
      "carbs_g": <g>,
      "fat_g": <g>,
      "notes": "any English caveats about the estimate (optional, short)"
    }
  ],
  "confidence": <0..1>,
  "search_used": <true if you used web search, else false>
}

Output ONLY the JSON object. No \`\`\` fences, no commentary.`;

  return { system, prompt };
}

export function weeklyInsightsPrompt(i: InsightsInput): Prompt {
  void i.locale;
  const system =
    "You are a personal fitness coach. Interpret the weekly metrics and give actionable English advice. Return ONLY a single valid JSON object.";

  const prompt = `Week: ${i.weekStart} → ${i.weekEnd}
Goal: ${i.goal} (target ${i.kcalTarget} kcal/day)
Daily kcal: ${i.dailyKcal.join(", ")}
Daily protein (g): ${i.proteinDaily.join(", ")}
Workouts: ${i.workoutCount}, total volume: ${i.workoutVolumeKg.toFixed(0)} kg-reps
Recovery scores: ${i.recoveryScores.join(", ") || "—"}
Sleep hours: ${i.sleepHours.map((h) => h.toFixed(1)).join(", ") || "—"}
Body weight: ${i.bodyWeightStart ?? "—"} → ${i.bodyWeightEnd ?? "—"} kg

Return JSON:
{
  "summary": "2-3 sentence English summary",
  "highlights": ["1-3 things that went well"],
  "warnings": ["0-3 things to watch out for"],
  "recommendations": ["2-4 concrete actions for this week"]
}
Output ONLY the JSON. No commentary.`;

  return { system, prompt };
}
