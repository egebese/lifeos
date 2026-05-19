import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

export const runtime = "nodejs";

export type FoodSuggestion = {
  name: string;
  uses: number;
  lastUsed: string; // ISO
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  meal: "breakfast" | "lunch" | "dinner" | "snack" | null;
};

export async function GET(req: Request) {
  const { user } = await requireSession();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] satisfies FoodSuggestion[] });
  }

  // Group case/whitespace-insensitive on name so duplicate spellings merge.
  // Per-group we surface the most recent entry's macros (these are stable for
  // a known food), then rank by frequency + recency.
  const rows = await db.execute(sql`
    WITH ranked AS (
      SELECT
        lower(btrim(name)) AS norm,
        name,
        kcal::numeric AS kcal,
        protein_g::numeric AS protein_g,
        carbs_g::numeric AS carbs_g,
        fat_g::numeric AS fat_g,
        meal,
        consumed_at,
        ROW_NUMBER() OVER (PARTITION BY lower(btrim(name)) ORDER BY consumed_at DESC) AS rn
      FROM food_entries
      WHERE user_id = ${user.id}
        AND name ILIKE ${"%" + q + "%"}
    ),
    grouped AS (
      SELECT
        norm,
        COUNT(*)::int AS uses,
        MAX(consumed_at) AS last_used
      FROM ranked
      GROUP BY norm
    )
    SELECT
      r.name,
      g.uses,
      g.last_used,
      r.kcal,
      r.protein_g,
      r.carbs_g,
      r.fat_g,
      r.meal
    FROM grouped g
    JOIN ranked r ON r.norm = g.norm AND r.rn = 1
    ORDER BY g.uses DESC, g.last_used DESC
    LIMIT 8
  `);

  const suggestions: FoodSuggestion[] = (rows.rows as Array<Record<string, unknown>>).map((r) => ({
    name: String(r.name),
    uses: Number(r.uses),
    lastUsed: new Date(r.last_used as string).toISOString(),
    kcal: r.kcal == null ? null : Number(r.kcal),
    proteinG: r.protein_g == null ? null : Number(r.protein_g),
    carbsG: r.carbs_g == null ? null : Number(r.carbs_g),
    fatG: r.fat_g == null ? null : Number(r.fat_g),
    meal: (r.meal as FoodSuggestion["meal"]) ?? null,
  }));

  return NextResponse.json({ suggestions });
}
