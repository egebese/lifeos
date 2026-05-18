// Demo stub: no real AI calls. All functions return safe defaults.
// The real app routes these through fal.ai; in the demo we surface friendly
// "feature available in self-hosted" messages from the UI directly.

export type AiKind = "food_vision" | "plan" | "insights" | "freeform";

export type ChatArgs = {
  userId: string;
  kind: AiKind;
  prompt: string;
  system?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  webSearch?: boolean;
};

export type VisionArgs = ChatArgs & {
  imageUrls: string[];
};

export type ChatResult = {
  text: string;
  raw: unknown;
};

export type TranscribeArgs = {
  userId: string;
  audioUrl: string;
  language?: "tr" | "en" | null;
};

export async function chat(_args: ChatArgs): Promise<ChatResult> {
  return { text: "", raw: null };
}

export async function vision(_args: VisionArgs): Promise<ChatResult> {
  return { text: "", raw: null };
}

export async function chatJson<T>(
  _args: ChatArgs & { schema: import("zod").ZodSchema<T> },
): Promise<T> {
  throw new Error("AI not available in demo");
}

export async function visionJson<T>(
  _args: VisionArgs & { schema: import("zod").ZodSchema<T> },
): Promise<T> {
  throw new Error("AI not available in demo");
}

export async function uploadLocal(_filePath: string): Promise<string> {
  return "";
}

export async function uploadBuffer(
  _buf: Buffer | Uint8Array,
  _filename: string,
  _contentType?: string,
): Promise<string> {
  return "";
}

export async function transcribeAudio(
  _args: TranscribeArgs,
): Promise<{ text: string; raw: unknown }> {
  return { text: "", raw: null };
}
