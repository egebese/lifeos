import { NextRequest, NextResponse } from "next/server";
import { eq, max } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { programDays, programs } from "@/lib/db/schema";

const Body = z.object({
  name: z.string().min(1).max(120),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await requireSession();
  const { id } = await params;

  const [prog] = await db
    .select({ id: programs.id, userId: programs.userId, isTemplate: programs.isTemplate })
    .from(programs)
    .where(eq(programs.id, id))
    .limit(1);
  if (!prog) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (prog.isTemplate || prog.userId !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // Append after the highest dayIndex currently in the program.
  const [{ maxIndex }] = await db
    .select({ maxIndex: max(programDays.dayIndex) })
    .from(programDays)
    .where(eq(programDays.programId, id));
  const nextIndex = (maxIndex ?? -1) + 1;

  const [row] = await db
    .insert(programDays)
    .values({ programId: id, dayIndex: nextIndex, name: parsed.data.name })
    .returning({ id: programDays.id });

  return NextResponse.json({ id: row.id, dayIndex: nextIndex });
}
