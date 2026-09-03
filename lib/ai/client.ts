import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db/client";
import { aiMessages } from "@/lib/db/schema";
import { searchWeb } from "@/lib/ai/web-search";

const DEFAULT_BASE_URL = "http://192.168.2.11:8081/v1";
const DEFAULT_MODEL = "/home/dogda/Documents/LLM_Runners/Qwen3.8-27B-Q3_K_M.gguf";
const DEFAULT_ASR_URL = "http://192.168.2.61:10202";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export type LocalAiErrorCode =
  | "local_ai_unavailable"
  | "local_ai_upstream_error"
  | "local_ai_invalid_response"
  | "local_ai_invalid_json";

export class LocalAiError extends Error {
  constructor(public readonly code: LocalAiErrorCode, message: string) {
    super(message);
    this.name = "LocalAiError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class LocalAiTimeoutError extends LocalAiError {
  constructor() {
    super("local_ai_unavailable", "local AI request timed out");
    this.name = "LocalAiTimeoutError";
  }
}

export class LocalAiUnreachableError extends LocalAiError {
  constructor() {
    super("local_ai_unavailable", "local AI service is unavailable");
    this.name = "LocalAiUnreachableError";
  }
}

export class LocalAiMissingModelError extends LocalAiError {
  constructor() {
    super("local_ai_unavailable", "configured local AI model is unavailable");
    this.name = "LocalAiMissingModelError";
  }
}

export class LocalAiMissingCapabilityError extends LocalAiError {
  constructor() {
    super("local_ai_invalid_response", "configured local AI model lacks multimodal capability");
    this.name = "LocalAiMissingCapabilityError";
  }
}

export class LocalAiUpstreamError extends LocalAiError {
  constructor() {
    super("local_ai_upstream_error", "local AI model returned an upstream error");
    this.name = "LocalAiUpstreamError";
  }
}

export class LocalAiInvalidResponseError extends LocalAiError {
  constructor() {
    super("local_ai_invalid_response", "local AI returned an invalid response");
    this.name = "LocalAiInvalidResponseError";
  }
}

export class LocalAiInvalidJsonError extends LocalAiError {
  constructor() {
    super("local_ai_invalid_json", "local AI returned invalid JSON");
    this.name = "LocalAiInvalidJsonError";
  }
}

export type AiKind = "food_vision" | "plan" | "insights" | "freeform";

export type ChatArgs = {
  userId: string;
  kind: AiKind;
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
};

export type VisionArgs = ChatArgs & {
  imageUrls: string[];
};

export type ChatResult = {
  text: string;
  raw: unknown;
};

type OpenAiMessage = {
  role: "system" | "user";
  content: string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];
};

type ModelConfig = { baseUrl: string; model: string };

function config(): ModelConfig {
  const configuredModel = process.env.LLAMA_CPP_MODEL;
  return {
    baseUrl: (process.env.LLAMA_CPP_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    model: configuredModel === undefined ? DEFAULT_MODEL : configuredModel,
  };
}

function endpoint(baseUrl: string, pathName: string): string {
  try {
    return new URL(pathName, `${baseUrl}/`).toString();
  } catch {
    throw new LocalAiUnreachableError();
  }
}

function timedOut(error: unknown): boolean {
  const name = (error as { name?: unknown } | null)?.name;
  return name === "AbortError" || name === "TimeoutError" || (error instanceof Error && /timed out|timeout/i.test(error.message));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function redactForLog(value: unknown): unknown {
  if (typeof value === "string") {
    const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (match) return { image: match[1], bytes: Buffer.from(match[2], "base64").length };
    return value;
  }
  if (value instanceof Uint8Array) return { bytes: value.byteLength };
  if (Array.isArray(value)) return value.map(redactForLog);
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactForLog(item)]));
  return value;
}

export function redactedLocalAiPrompt(endpoint: string, request: unknown): object {
  return redactForLog({ endpoint, request }) as object;
}

async function recordAiMessage(args: {
  userId: string;
  kind: AiKind;
  prompt: unknown;
  response: unknown;
  model: string;
  errorMsg: string | null;
}) {
  if (!process.env.DATABASE_URL) return;
  try {
    await db.insert(aiMessages).values({
      userId: args.userId,
      kind: args.kind,
      prompt: redactForLog(args.prompt) as object,
      response: redactForLog(args.response) as object | null,
      model: args.model,
      costCents: null,
      errorMsg: args.errorMsg,
    });
  } catch {
    // AI availability must not depend on logging availability.
  }
}

function localErrorCode(error: unknown): string {
  return error instanceof LocalAiError ? error.code : "local_ai_unavailable";
}

export function localAiRouteFailure(error: unknown): { status: 503 | 502; detail: string } {
  if (!(error instanceof LocalAiError)) return { status: 503, detail: "local_ai_unavailable" };
  return {
    status: error.code === "local_ai_unavailable" ? 503 : 502,
    detail: error.code,
  };
}

const validationCache = new Map<string, Promise<void>>();

async function validateModel({ baseUrl, model }: ModelConfig): Promise<void> {
  if (model !== DEFAULT_MODEL) throw new LocalAiMissingModelError();

  let response: Response;
  try {
    response = await fetch(endpoint(baseUrl, "models"), { signal: AbortSignal.timeout(5000) });
  } catch (error) {
    if (timedOut(error)) throw new LocalAiTimeoutError();
    throw new LocalAiUnreachableError();
  }
  if (!response.ok) throw new LocalAiUnreachableError();

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new LocalAiUnreachableError();
  }
  const data = isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];
  if (!data.some((entry) => isRecord(entry) && entry.id === model)) throw new LocalAiMissingModelError();

  const models = isRecord(payload) && Array.isArray(payload.models) ? payload.models : [];
  const metadata = models.find(
    (entry) => isRecord(entry) && (entry.id === model || entry.model === model || entry.name === model),
  );
  if (!isRecord(metadata) || !Array.isArray(metadata.capabilities) || !metadata.capabilities.includes("multimodal")) {
    throw new LocalAiMissingCapabilityError();
  }
}

function ensureModel(configured: ModelConfig): Promise<void> {
  const key = `${configured.baseUrl}\n${configured.model}`;
  let promise = validationCache.get(key);
  if (!promise) {
    promise = validateModel(configured);
    validationCache.set(key, promise);
  }
  return promise;
}

async function completion(args: ChatArgs, messages: OpenAiMessage[], defaultTemperature: number, defaultMaxTokens: number): Promise<ChatResult> {
  const configured = config();
  const request = {
    model: configured.model,
    messages,
    temperature: args.temperature ?? defaultTemperature,
    max_tokens: args.maxTokens ?? defaultMaxTokens,
    stream: false,
  };
  let responseForLog: unknown = null;
  let errorMsg: string | null = null;
  try {
    await ensureModel(configured);
    let response: Response;
    try {
      response = await fetch(endpoint(configured.baseUrl, "chat/completions"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(20000),
      });
    } catch (error) {
      if (timedOut(error)) throw new LocalAiTimeoutError();
      throw new LocalAiUnreachableError();
    }
    if (!response.ok) throw new LocalAiUpstreamError();

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      if (timedOut(error)) throw new LocalAiTimeoutError();
      throw new LocalAiInvalidResponseError();
    }
    if (isRecord(payload) && payload.error) throw new LocalAiUpstreamError();
    const content = isRecord(payload) && Array.isArray(payload.choices) && isRecord(payload.choices[0])
      && isRecord(payload.choices[0].message) ? payload.choices[0].message.content : null;
    if (typeof content !== "string" || !content.trim()) throw new LocalAiInvalidResponseError();
    responseForLog = payload;
    return { text: content, raw: payload };
  } catch (error) {
    errorMsg = localErrorCode(error);
    throw error;
  } finally {
    await recordAiMessage({
      userId: args.userId,
      kind: args.kind,
      prompt: redactedLocalAiPrompt(configured.baseUrl, request),
      response: responseForLog,
      model: configured.model,
      errorMsg,
    });
  }
}

export async function chat(args: ChatArgs): Promise<ChatResult> {
  const messages: OpenAiMessage[] = [];
  if (args.system) messages.push({ role: "system", content: args.system });
  messages.push({ role: "user", content: args.prompt });
  return completion(args, messages, 0.4, 2048);
}

function imageBytes(value: string): { mime: "image/jpeg" | "image/png" | "image/webp"; bytes: Buffer } {
  const match = typeof value === "string" && value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match || match[2].length % 4 !== 0) throw new LocalAiInvalidResponseError();
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || bytes.toString("base64") !== match[2]) throw new LocalAiInvalidResponseError();
  const mime = match[1] as "image/jpeg" | "image/png" | "image/webp";
  const valid = mime === "image/jpeg"
    ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : mime === "image/png"
      ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (!valid) throw new LocalAiInvalidResponseError();
  return { mime, bytes };
}

export async function vision(args: VisionArgs): Promise<ChatResult> {
  if (!Array.isArray(args.imageUrls) || args.imageUrls.length === 0) throw new LocalAiInvalidResponseError();
  const images = args.imageUrls.map(imageBytes);
  const content = [
    { type: "text" as const, text: args.prompt },
    ...images.map((_image, index) => ({ type: "image_url" as const, image_url: { url: args.imageUrls[index] } })),
  ];
  const messages: OpenAiMessage[] = [];
  if (args.system) messages.push({ role: "system", content: args.system });
  messages.push({ role: "user", content });
  return completion(args, messages, 0.3, 1024);
}

function tryParse(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function validateJson<T>(text: string, schema: import("zod").ZodSchema<T>): T | null {
  const parsed = tryParse(text);
  if (parsed === null) return null;
  const validated = schema.safeParse(parsed);
  return validated.success ? validated.data : null;
}

function stampSearch<T>(value: T, used: boolean, enabled: boolean): T {
  if (!enabled || !isRecord(value) || Array.isArray(value)) return value;
  return { ...value, search_used: used } as T;
}

export async function chatJson<T>(
  args: ChatArgs & { schema: import("zod").ZodSchema<T>; webSearchQuery?: string },
): Promise<T> {
  const { schema, webSearchQuery, ...rest } = args;
  let search = { context: "", used: false };
  if (typeof webSearchQuery === "string") {
    try {
      search = await searchWeb(webSearchQuery);
    } catch {
      search = { context: "", used: false };
    }
  }
  const prompt = search.context ? `${search.context}\n\n${rest.prompt}` : rest.prompt;
  const first = await chat({ ...rest, prompt });
  const firstParsed = validateJson(first.text, schema);
  if (firstParsed !== null) return stampSearch(firstParsed, search.used, webSearchQuery !== undefined);

  const retry = await chat({
    ...rest,
    prompt: `${prompt}\n\nYour previous response was not valid JSON. Return ONLY a single JSON object matching the schema. No markdown, no prose.\n\nPrevious response:\n${first.text}`,
  });
  const retryParsed = validateJson(retry.text, schema);
  if (retryParsed === null) throw new LocalAiInvalidJsonError();
  return stampSearch(retryParsed, search.used, webSearchQuery !== undefined);
}

export async function visionJson<T>(
  args: VisionArgs & { schema: import("zod").ZodSchema<T> },
): Promise<T> {
  const { schema, ...rest } = args;
  const first = await vision(rest);
  const firstParsed = validateJson(first.text, schema);
  if (firstParsed !== null) return firstParsed;
  const retry = await vision({
    ...rest,
    prompt: `${rest.prompt}\n\nReturn ONLY a single JSON object. No markdown, no prose.`,
  });
  const retryParsed = validateJson(retry.text, schema);
  if (retryParsed === null) throw new LocalAiInvalidJsonError();
  return retryParsed;
}

const MIME_BY_EXTENSION: Record<string, "image/jpeg" | "image/png" | "image/webp"> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function uploadLocal(filePath: string): Promise<string> {
  const mime = MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()];
  if (!mime) throw new LocalAiInvalidResponseError();
  let bytes: Buffer;
  try {
    bytes = await fs.readFile(filePath);
  } catch {
    throw new LocalAiInvalidResponseError();
  }
  if (bytes.length > MAX_IMAGE_BYTES) throw new LocalAiInvalidResponseError();
  const encoded = `data:${mime};base64,${bytes.toString("base64")}`;
  imageBytes(encoded);
  return encoded;
}

export class AsrError extends Error {
  constructor(public readonly code: "asr_invalid_response" | "asr_unavailable") {
    super(code);
    this.name = "AsrError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type TranscribeArgs = {
  userId: string;
  audio: Buffer | Uint8Array;
  contentType: string;
};

export async function transcribeAudio(args: TranscribeArgs): Promise<{ text: string; raw: unknown }> {
  const baseUrl = (process.env.ASR_HTTP_URL || DEFAULT_ASR_URL).replace(/\/+$/, "");
  const asrToken = process.env.ASR_HTTP_TOKEN;
  const audio = Buffer.from(args.audio);
  let response: Response | null = null;
  let responseForLog: unknown = null;
  let errorMsg: string | null = null;
  try {
    if (typeof asrToken !== "string" || !asrToken.trim()) throw new AsrError("asr_unavailable");

    let url: string;
    try {
      url = new URL("v1/audio/transcriptions", `${baseUrl}/`).toString();
    } catch {
      throw new AsrError("asr_unavailable");
    }
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": args.contentType,
          "x-asr-token": asrToken,
        },
        body: audio,
        signal: AbortSignal.timeout(45000),
      });
    } catch {
      throw new AsrError("asr_unavailable");
    }
    if ([503, 504].includes(response.status)) throw new AsrError("asr_unavailable");
    if (![200].includes(response.status)) throw new AsrError("asr_invalid_response");
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AsrError("asr_invalid_response");
    }
    const text = isRecord(payload) ? payload.text : null;
    if (typeof text !== "string" || !text.trim()) throw new AsrError("asr_invalid_response");
    responseForLog = { status: response.status };
    return { text: text.trim(), raw: payload };
  } catch (error) {
    errorMsg = error instanceof AsrError ? error.code : "asr_unavailable";
    throw error instanceof AsrError ? error : new AsrError("asr_unavailable");
  } finally {
    await recordAiMessage({
      userId: args.userId,
      kind: "freeform",
      prompt: { endpoint: baseUrl, contentType: args.contentType, bytes: audio.length },
      response: responseForLog ?? (response ? { status: response.status } : null),
      model: "local-asr",
      errorMsg,
    });
  }
}
