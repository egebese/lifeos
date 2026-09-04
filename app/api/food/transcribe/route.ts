import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { AsrError, transcribeAudio } from "@/lib/ai/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB hard limit
export async function processAudioRequest(req: Request, userId: string) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_audio" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "empty_audio" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const type = file.type || "audio/webm";
  if (!type.startsWith("audio/")) {
    return NextResponse.json({ error: "unsupported_format", detail: type }, { status: 415 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const { text } = await transcribeAudio({
      userId,
      audio: buf,
      contentType: type,
    });
    return NextResponse.json({ text: text.trim() });
  } catch (e) {
    const detail = e instanceof AsrError ? e.code : "asr_unavailable";
    const status = detail === "asr_unavailable" ? 503 : 502;
    console.error("[food/transcribe]", detail);
    return NextResponse.json(
      { error: "transcribe_failed", detail },
      { status },
    );
  }
}

export async function POST(req: Request) {
  const { user } = await requireSession();
  return processAudioRequest(req, user.id);
}
