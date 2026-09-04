import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { processAudioRequest } from "./route.js";

const originalFetch = globalThis.fetch;
const originalAsrUrl = process.env.ASR_HTTP_URL;
const originalAsrToken = process.env.ASR_HTTP_TOKEN;

process.env.ASR_HTTP_URL = "http://127.0.0.1:10202";
process.env.ASR_HTTP_TOKEN = "test-token";

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function requestFor(bytes: Uint8Array, type = "audio/webm") {
  const form = new FormData();
  form.set("audio", new File([bytes as unknown as BlobPart], "voice.webm", { type }));
  return new Request("http://localhost/api/food/transcribe", { method: "POST", body: form });
}

test("processAudioRequest forwards multipart bytes, content type, and ASR token", async () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  let received: { url: string; body: Uint8Array; headers: Headers } | undefined;
  globalThis.fetch = async (input, init) => {
    received = {
      url: String(input),
      body: new Uint8Array(await new Response(init?.body as BodyInit).arrayBuffer()),
      headers: new Headers(init?.headers),
    };
    return new Response(JSON.stringify({ text: "  eggs and toast  " }), { status: 200 });
  };

  const response = await processAudioRequest(requestFor(bytes), "user-1");

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { text: "eggs and toast" });
  assert.equal(received?.url, "http://127.0.0.1:10202/v1/audio/transcriptions");
  assert.deepEqual(received?.body, bytes);
  assert.equal(received?.headers.get("content-type"), "audio/webm");
  assert.equal(received?.headers.get("x-asr-token"), "test-token");
});

test("processAudioRequest maps ASR bridge failures to safe route errors", async () => {
  for (const [upstream, expectedStatus, expectedDetail] of [
    [400, 502, "asr_invalid_response"],
    [401, 502, "asr_invalid_response"],
    [404, 502, "asr_invalid_response"],
    [413, 502, "asr_invalid_response"],
    [415, 502, "asr_invalid_response"],
    [422, 502, "asr_invalid_response"],
    [502, 502, "asr_invalid_response"],
    [503, 503, "asr_unavailable"],
    [504, 503, "asr_unavailable"],
  ] as const) {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: "upstream detail" }), { status: upstream });
    const response = await processAudioRequest(requestFor(new Uint8Array([1])), "user-1");
    assert.equal(response.status, expectedStatus);
    assert.deepEqual(await response.json(), { error: "transcribe_failed", detail: expectedDetail });
  }
});

test("processAudioRequest maps network and timeout failures to unavailable", async () => {
  for (const failure of [new Error("offline"), new DOMException("timed out", "TimeoutError")]) {
    globalThis.fetch = async () => {
      throw failure;
    };
    const response = await processAudioRequest(requestFor(new Uint8Array([1])), "user-1");
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "transcribe_failed", detail: "asr_unavailable" });
  }
});

test("processAudioRequest preserves multipart validation", async () => {
  globalThis.fetch = async () => {
    throw new Error("must not fetch");
  };

  const missing = await processAudioRequest(new Request("http://localhost", { method: "POST" }), "user-1");
  assert.equal(missing.status, 400);
  assert.deepEqual(await missing.json(), { error: "missing_audio" });

  const invalid = new FormData();
  invalid.set("audio", new File([new Uint8Array([1])], "x.txt", { type: "text/plain" }));
  const invalidResponse = await processAudioRequest(new Request("http://localhost", { method: "POST", body: invalid }), "user-1");
  assert.equal(invalidResponse.status, 415);
  assert.deepEqual(await invalidResponse.json(), { error: "unsupported_format", detail: "text/plain" });
});

test("processAudioRequest rejects an empty 200 transcript", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ text: "   " }), { status: 200 });
  const response = await processAudioRequest(requestFor(new Uint8Array([1])), "user-1");
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: "transcribe_failed", detail: "asr_invalid_response" });
});

test("processAudioRequest rejects a missing ASR token before making a request", async () => {
  const token = process.env.ASR_HTTP_TOKEN;
  delete process.env.ASR_HTTP_TOKEN;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls++;
    throw new Error("must not fetch without an ASR token");
  };

  try {
    const response = await processAudioRequest(requestFor(new Uint8Array([1])), "user-1");
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "transcribe_failed", detail: "asr_unavailable" });
    assert.equal(fetchCalls, 0);
  } finally {
    if (token === undefined) delete process.env.ASR_HTTP_TOKEN;
    else process.env.ASR_HTTP_TOKEN = token;
  }
});

test.after(() => {
  globalThis.fetch = originalFetch;
  if (originalAsrUrl === undefined) delete process.env.ASR_HTTP_URL;
  else process.env.ASR_HTTP_URL = originalAsrUrl;
  if (originalAsrToken === undefined) delete process.env.ASR_HTTP_TOKEN;
  else process.env.ASR_HTTP_TOKEN = originalAsrToken;
});
