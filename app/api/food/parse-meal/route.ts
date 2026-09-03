import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { chatJson, localAiRouteFailure } from "@/lib/ai/client";
import { mealParserPrompt } from "@/lib/ai/prompts";
import { MealLogSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";
// Web-search-augmented calls take longer than a typical chat — give them more
// headroom than the default vercel function timeout.
export const maxDuration = 60;

const Body = z.object({
  text: z.string().min(2).max(2000),
  defaultMeal: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
});

export async function POST(req: Request) {
  const { user } = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { system, prompt } = mealParserPrompt({
    locale: "en",
    text: parsed.data.text,
    nowIso: new Date().toISOString(),
    defaultMeal: parsed.data.defaultMeal,
  });

  try {
    const out = await chatJson({
      userId: user.id,
      kind: "food_vision",
      system,
      prompt,
      schema: MealLogSchema,
      temperature: 0.2,
      maxTokens: 2500,
      webSearchQuery: parsed.data.text,
    });
    return NextResponse.json({ parsed: out });
  } catch (e) {
    const failure = localAiRouteFailure(e);
    console.error("[food/parse-meal]", failure.detail);
    return NextResponse.json(
      { error: "parse_failed", detail: failure.detail },
      { status: failure.status },
    );
  }
}
