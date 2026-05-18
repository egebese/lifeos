// GET → find any Whoop workout whose time window overlaps our local workout's
// startedAt..endedAt (or up to now if still running). Display-only — calories
// are NOT subtracted anywhere; Whoop's daily TDEE already includes them.
//
// POST → trigger a Whoop sync first, then run the same overlap query.

import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { workouts, whoopTokens, whoopWorkouts } from "@/lib/db/schema";
import { syncAll } from "@/lib/whoop/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

async function findOverlap(userId: string, workoutId: string) {
  const [w] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .limit(1);
  if (!w) return { error: "not_found" as const, status: 404 };

  const start = new Date(w.startedAt);
  const end = w.endedAt ? new Date(w.endedAt) : new Date();
  // ±2 minute slack so Whoop's auto-detected start/end edges still match.
  const startSlack = new Date(start.getTime() - 2 * 60_000);
  const endSlack = new Date(end.getTime() + 2 * 60_000);

  const rows = await db
    .select()
    .from(whoopWorkouts)
    .where(
      and(
        eq(whoopWorkouts.userId, userId),
        lte(whoopWorkouts.start, endSlack),
        gte(whoopWorkouts.end, startSlack),
      ),
    );

  if (rows.length === 0) return { match: null };

  // Pick the one with greatest overlap duration.
  let best = rows[0];
  let bestOverlap = 0;
  for (const r of rows) {
    const a = Math.max(start.getTime(), new Date(r.start).getTime());
    const b = Math.min(end.getTime(), new Date(r.end).getTime());
    const ov = Math.max(0, b - a);
    if (ov > bestOverlap) {
      bestOverlap = ov;
      best = r;
    }
  }

  const durationMs = new Date(best.end).getTime() - new Date(best.start).getTime();
  // kJ → kcal (1 kcal = 4.184 kJ). Whoop "kilojoules" is the workout total.
  let kcal: number | null = null;
  if (best.raw && typeof best.raw === "object") {
    const score = (best.raw as { score?: { kilojoule?: number } }).score;
    if (score && typeof score.kilojoule === "number") {
      kcal = Math.round(score.kilojoule / 4.184);
    }
  }

  return {
    match: {
      whoopId: best.whoopId,
      sport: best.sport,
      start: best.start,
      end: best.end,
      durationMin: Math.round(durationMs / 60000),
      strain: best.strain ? Number(best.strain) : null,
      avgHr: (best.raw as { score?: { average_heart_rate?: number } } | null)?.score
        ?.average_heart_rate ?? null,
      maxHr: (best.raw as { score?: { max_heart_rate?: number } } | null)?.score
        ?.max_heart_rate ?? null,
      hrZones: best.hrZones,
      kcal,
    },
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await requireSession();
  const { id } = await params;
  const result = await findOverlap(user.id, id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await requireSession();
  const { id } = await params;

  // Try to sync first if Whoop is connected.
  const [tok] = await db
    .select({ userId: whoopTokens.userId })
    .from(whoopTokens)
    .where(eq(whoopTokens.userId, user.id))
    .limit(1);
  if (tok) {
    try {
      await syncAll(user.id, 3);
    } catch (e) {
      console.warn("[whoop sync during workout pull failed]", e);
    }
  }

  const result = await findOverlap(user.id, id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
