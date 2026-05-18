import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { programs } from "@/lib/db/schema";

const Body = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const { user } = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const [row] = await db
    .insert(programs)
    .values({
      userId: user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .returning({ id: programs.id });
  return NextResponse.json({ id: row.id });
}
