import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { workouts } from "@/lib/db/schema";

const Body = z.object({
  programId: z.string().uuid().nullable().optional(),
  programDayId: z.string().uuid().nullable().optional(),
  startedAt: z.string().datetime().optional(),
});

export async function POST(req: Request) {
  const { user } = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const [w] = await db
    .insert(workouts)
    .values({
      userId: user.id,
      programId: parsed.data.programId ?? null,
      programDayId: parsed.data.programDayId ?? null,
      ...(parsed.data.startedAt ? { startedAt: new Date(parsed.data.startedAt) } : {}),
    })
    .returning({ id: workouts.id });
  return NextResponse.json({ id: w.id });
}
