import { z } from "zod";

export const FoodVisionSchema = z.object({
  name: z.string().min(1),
  kcal: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});
export type FoodVision = z.infer<typeof FoodVisionSchema>;

export const MealItemSchema = z.object({
  name: z.string(),
  // Human-readable portion using hand-measure idioms ("1 avuç içi salmon (~150 g)",
  // "1 yumruk pilav", "2 yemek kaşığı zeytinyağı") plus a grams/adet fallback.
  portion: z.string().optional(),
  kcal: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  ingredients: z
    .array(
      z.object({
        name: z.string(),
        qty: z.number().nonnegative().optional(),
        unit: z.string().optional(),
      }),
    )
    .optional(),
});

export const DayPlanSchema = z.object({
  date: z.string(),
  breakfast: z.array(MealItemSchema).default([]),
  lunch: z.array(MealItemSchema).default([]),
  dinner: z.array(MealItemSchema).default([]),
  snacks: z.array(MealItemSchema).default([]),
  totals: z
    .object({
      kcal: z.number().nonnegative(),
      protein_g: z.number().nonnegative(),
      carbs_g: z.number().nonnegative(),
      fat_g: z.number().nonnegative(),
    })
    .optional(),
});

export const MealPlanSchema = z.object({
  starts_on: z.string(),
  ends_on: z.string(),
  days: z.array(DayPlanSchema),
  shopping_list: z.array(
    z.object({
      name: z.string(),
      qty: z.number().nonnegative().optional(),
      unit: z.string().optional(),
      aisle: z.string().optional(),
      // Toggled by the user as they shop; not produced by the model.
      checked: z.boolean().optional(),
    }),
  ),
});
export type MealPlanOut = z.infer<typeof MealPlanSchema>;

export const InsightsSchema = z.object({
  summary: z.string(),
  highlights: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
});
export type InsightsOut = z.infer<typeof InsightsSchema>;

// AI-generated training program. Each exercise carries a `search` term that the
// server matches against the exercises table by name + body_part.
export const AiProgramExerciseSchema = z.object({
  search: z.string().min(2),
  body_part: z.string().optional(),
  equipment: z.string().optional(),
  sets: z.number().int().min(1).max(10),
  reps: z.number().int().min(1).max(100),
  rest_seconds: z.number().int().min(0).max(600).optional(),
  notes: z.string().max(240).optional(),
});

export const AiProgramDaySchema = z.object({
  name: z.string().min(1),
  focus: z.string().optional(),
  exercises: z.array(AiProgramExerciseSchema).min(1).max(12),
});

export const AiProgramSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(800).default(""),
  days: z.array(AiProgramDaySchema).min(1).max(7),
});
export type AiProgramOut = z.infer<typeof AiProgramSchema>;

// Parsed meal log from free-form text or voice. The AI may split the input
// into multiple items (e.g. "wrap, plus an extra egg, plus cheese") or roll
// composed ingredients into a single item.
export const MealLogItemSchema = z.object({
  name: z.string().min(1).max(160),
  quantity: z.string().max(120).optional(),
  kcal: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  notes: z.string().max(240).optional(),
});

export const MealLogSchema = z.object({
  meal: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  items: z.array(MealLogItemSchema).min(1).max(12),
  confidence: z.number().min(0).max(1).optional(),
  search_used: z.boolean().optional(),
});
export type MealLogOut = z.infer<typeof MealLogSchema>;
