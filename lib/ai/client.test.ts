import { after, afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import {
  chat,
  chatJson,
  LocalAiInvalidResponseError,
  LocalAiInvalidJsonError,
  LocalAiMissingCapabilityError,
  LocalAiMissingModelError,
  LocalAiTimeoutError,
  localAiRouteFailure,
  redactedLocalAiPrompt,
  redactForLog,
  uploadLocal,
  vision,
} from "./client.js";

const MODEL = "/home/dogda/Documents/LLM_Runners/Qwen3.8-27B-Q3_K_M.gguf";
const originalFetch = globalThis.fetch;
const originalDatabaseUrl = process.env.DATABASE_URL;

delete process.env.DATABASE_URL;

after(() => {
  globalThis.fetch = originalFetch;
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

type RequestRecord = { method: string; url: string; body: string };

async function readRequest(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(res: ServerResponse, body: unknown, status = 200) {
  const json = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(json);
}

async function withServer(
  handler: (req: IncomingMessage, res: ServerResponse, requests: RequestRecord[]) => void | Promise<void>,
  run: (baseUrl: string, requests: RequestRecord[]) => Promise<void>,
) {
  const requests: RequestRecord[] = [];
  const server = createServer(async (req, res) => {
    const body = await readRequest(req);
    requests.push({ method: req.method ?? "", url: req.url ?? "", body });
    await handler(req, res, requests);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server did not start");
  const baseUrl = `http://127.0.0.1:${address.port}/v1`;
  process.env.LLAMA_CPP_BASE_URL = baseUrl;
  process.env.LLAMA_CPP_MODEL = MODEL;
  try {
    await run(baseUrl, requests);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

function validModels() {
  return {
    data: [{ id: MODEL }],
    models: [{ id: MODEL, model: MODEL, name: MODEL, capabilities: ["chat", "multimodal"] }],
  };
}

function chatResponse(content: string) {
  return { choices: [{ message: { role: "assistant", content } }] };
}

function responseWithJsonError(error: Error): Response {
  const response = new Response("body", { status: 200 });
  response.json = async () => {
    throw error;
  };
  return response;
}

test("chat validates the exact multimodal model once and sends OpenAI messages", async () => {
  await withServer(
    async (req, res) => {
      if (req.url === "/v1/models") return sendJson(res, validModels());
      if (req.url === "/v1/chat/completions") return sendJson(res, chatResponse("hello"));
      sendJson(res, { error: "not found" }, 404);
    },
    async (_base, requests) => {
      assert.deepEqual(await chat({
        userId: "user-1",
        kind: "freeform",
        system: "Be concise",
        prompt: "Say hello",
        temperature: 0.2,
        maxTokens: 17,
      }), { text: "hello", raw: chatResponse("hello") });
      await chat({ userId: "user-1", kind: "freeform", prompt: "Again" });

      assert.equal(requests.filter((x) => x.url === "/v1/models").length, 1);
      const body = JSON.parse(requests.find((x) => x.url === "/v1/chat/completions")!.body);
      assert.deepEqual(body.messages, [
        { role: "system", content: "Be concise" },
        { role: "user", content: "Say hello" },
      ]);
      assert.equal(body.model, MODEL);
      assert.equal(body.stream, false);
      assert.equal(body.temperature, 0.2);
      assert.equal(body.max_tokens, 17);
    },
  );
});

test("model validation has named errors for missing model and capability", async () => {
  await withServer(
    async (_req, res) => sendJson(res, { data: [{ id: "other" }], models: [] }),
    async () => {
      await assert.rejects(
        () => chat({ userId: "u", kind: "freeform", prompt: "x" }),
        (error: unknown) => error instanceof LocalAiMissingModelError && error.code === "local_ai_unavailable",
      );
    },
  );

  await withServer(
    async (_req, res) => sendJson(res, { data: [{ id: MODEL }], models: [{ id: MODEL, model: MODEL, name: MODEL, capabilities: ["chat"] }] }),
    async () => {
      await assert.rejects(
        () => chat({ userId: "u", kind: "freeform", prompt: "x" }),
        (error: unknown) => error instanceof LocalAiMissingCapabilityError && error.code === "local_ai_invalid_response",
      );
    },
  );
});

test("rejects a configured model id that is not the verified model", async () => {
  process.env.LLAMA_CPP_BASE_URL = "http://127.0.0.1:65531/v1";
  process.env.LLAMA_CPP_MODEL = `${MODEL}-unverified`;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls++;
    throw new Error("the model list must not be requested");
  };

  await assert.rejects(
    () => chat({ userId: "u", kind: "freeform", prompt: "x" }),
    (error: unknown) => error instanceof LocalAiMissingModelError && error.code === "local_ai_unavailable",
  );
  assert.equal(fetchCalls, 0);
  process.env.LLAMA_CPP_MODEL = MODEL;
});

test("caches a failed model validation for the process lifetime", async () => {
  let modelCalls = 0;
  await withServer(
    async (req, res) => {
      if (req.url === "/v1/models") {
        modelCalls++;
        return sendJson(res, { data: [{ id: "other" }], models: [] });
      }
      sendJson(res, {}, 404);
    },
    async () => {
      const run = () => chat({ userId: "u", kind: "freeform", prompt: "x" });
      await assert.rejects(run, (error: unknown) => error instanceof LocalAiMissingModelError);
      await assert.rejects(run, (error: unknown) => error instanceof LocalAiMissingModelError);
      assert.equal(modelCalls, 1);
    },
  );
});

test("redacts image data URLs and audio bytes before AI logging", () => {
  const image = "data:image/jpeg;base64,/9j/";
  const audio = Buffer.from("private audio bytes");
  const redacted = redactForLog({ image, audio, nested: [image, audio] });

  assert.deepEqual(redacted, {
    image: { image: "image/jpeg", bytes: 3 },
    audio: { bytes: audio.length },
    nested: [{ image: "image/jpeg", bytes: 3 }, { bytes: audio.length }],
  });
  assert.doesNotMatch(JSON.stringify(redacted), /private audio bytes|\/9j\//);
});

test("includes the local LLM endpoint in redacted prompt metadata", () => {
  const image = "data:image/jpeg;base64,/9j/";
  const metadata = redactedLocalAiPrompt("http://127.0.0.1:8081/v1", {
    model: MODEL,
    messages: [{ role: "user", content: image }],
  });

  assert.deepEqual(metadata, {
    endpoint: "http://127.0.0.1:8081/v1",
    request: {
      model: MODEL,
      messages: [{ role: "user", content: { image: "image/jpeg", bytes: 3 } }],
    },
  });
  assert.doesNotMatch(JSON.stringify(metadata), /data:image\/jpeg|\/9j\//);
});

test("maps local AI failures to safe route status and detail", () => {
  assert.deepEqual(localAiRouteFailure(new LocalAiTimeoutError()), {
    status: 503,
    detail: "local_ai_unavailable",
  });
  assert.deepEqual(localAiRouteFailure(new LocalAiInvalidJsonError()), {
    status: 502,
    detail: "local_ai_invalid_json",
  });
  assert.deepEqual(localAiRouteFailure(new Error("secret upstream response")), {
    status: 503,
    detail: "local_ai_unavailable",
  });
});

test("model-list timeout is a typed unavailable error", async () => {
  process.env.LLAMA_CPP_BASE_URL = "http://127.0.0.1:65530/v1";
  process.env.LLAMA_CPP_MODEL = MODEL;
  globalThis.fetch = async () => {
    throw new DOMException("timed out", "TimeoutError");
  };

  await assert.rejects(
    () => chat({ userId: "u", kind: "freeform", prompt: "x" }),
    (error: unknown) => error instanceof LocalAiTimeoutError && error.code === "local_ai_unavailable",
  );
});

test("vision sends capped local image data URLs and rejects unsafe input", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "lifeos-ai-"));
  const imagePath = path.join(dir, "meal.JPG");
  await writeFile(imagePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]));

  try {
    const dataUrl = await uploadLocal(imagePath);
    assert.match(dataUrl, /^data:image\/jpeg;base64,/);

    await withServer(
      async (req, res) => {
        if (req.url === "/v1/models") return sendJson(res, validModels());
        if (req.url === "/v1/chat/completions") return sendJson(res, chatResponse("seen"));
        sendJson(res, { error: "not found" }, 404);
      },
      async (_base, requests) => {
        await vision({ userId: "u", kind: "food_vision", prompt: "Describe it", imageUrls: [dataUrl] });
        const body = JSON.parse(requests.find((x) => x.url === "/v1/chat/completions")!.body);
        assert.deepEqual(body.messages[0].content, [
          { type: "text", text: "Describe it" },
          { type: "image_url", image_url: { url: dataUrl } },
        ]);
      },
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  await assert.rejects(
    () => vision({ userId: "u", kind: "food_vision", prompt: "x", imageUrls: ["https://example.com/meal.jpg"] }),
    (error: unknown) => error instanceof LocalAiInvalidResponseError && error.code === "local_ai_invalid_response",
  );
});

test("completion errors and malformed content use typed local-AI errors", async () => {
  await withServer(
    async (req, res) => {
      if (req.url === "/v1/models") return sendJson(res, validModels());
      if (req.url === "/v1/chat/completions") return sendJson(res, { error: { message: "model failed" } }, 500);
      sendJson(res, {}, 404);
    },
    async () => {
      await assert.rejects(
        () => chat({ userId: "u", kind: "freeform", prompt: "x" }),
        (error: unknown) => error instanceof Error && (error as { code?: string }).code === "local_ai_upstream_error",
      );
    },
  );

  await withServer(
    async (req, res) => {
      if (req.url === "/v1/models") return sendJson(res, validModels());
      if (req.url === "/v1/chat/completions") return sendJson(res, { choices: [] });
      sendJson(res, {}, 404);
    },
    async () => {
      await assert.rejects(
        () => chat({ userId: "u", kind: "freeform", prompt: "x" }),
        (error: unknown) => error instanceof LocalAiInvalidResponseError && error.code === "local_ai_invalid_response",
      );
    },
  );
});

test("maps a chat completion body timeout to a typed unavailable error", async () => {
  await withServer(
    async (req, res) => {
      if (req.url === "/v1/models") return sendJson(res, validModels());
      sendJson(res, {}, 404);
    },
    async () => {
      const fetchForModels = globalThis.fetch;
      globalThis.fetch = async (input, init) => {
        if (String(input).endsWith("/v1/chat/completions")) {
          return responseWithJsonError(new DOMException("response read timed out", "TimeoutError"));
        }
        return fetchForModels(input, init);
      };

      await assert.rejects(
        () => chat({ userId: "u", kind: "freeform", prompt: "x" }),
        (error: unknown) => error instanceof LocalAiTimeoutError && error.code === "local_ai_unavailable",
      );
    },
  );
});

test("keeps an ordinary chat completion body error as invalid response", async () => {
  await withServer(
    async (req, res) => {
      if (req.url === "/v1/models") return sendJson(res, validModels());
      sendJson(res, {}, 404);
    },
    async () => {
      const fetchForModels = globalThis.fetch;
      globalThis.fetch = async (input, init) => {
        if (String(input).endsWith("/v1/chat/completions")) {
          return responseWithJsonError(new SyntaxError("invalid JSON"));
        }
        return fetchForModels(input, init);
      };

      await assert.rejects(
        () => chat({ userId: "u", kind: "freeform", prompt: "x" }),
        (error: unknown) => error instanceof LocalAiInvalidResponseError && error.code === "local_ai_invalid_response",
      );
    },
  );
});

test("chatJson searches once, reuses context for retry, and owns search_used", async () => {
  const searchHtml = `<div class="result results_links"><h2><a class="result__a" href="https://example.com/food">Food source</a></h2><a class="result__snippet">A reference.</a></div>`;
  let searchCalls = 0;
  await withServer(
    async (req, res, requests) => {
      if (req.url === "/v1/models") return sendJson(res, validModels());
      if (req.url === "/v1/chat/completions") {
        const call = requests.filter((x) => x.url === "/v1/chat/completions").length;
        return sendJson(res, chatResponse(call === 1 ? "not json" : JSON.stringify({ value: "ok", search_used: false })));
      }
      sendJson(res, {}, 404);
    },
    async (_base, requests) => {
      const fetchForLlm = globalThis.fetch;
      globalThis.fetch = async (input, init) => {
        if (String(input).startsWith("https://html.duckduckgo.com/")) {
          searchCalls++;
          return new Response(searchHtml, { status: 200 });
        }
        return fetchForLlm(input, init);
      };

      const out = await chatJson({
        userId: "u",
        kind: "food_vision",
        prompt: "Parse meal",
        webSearchQuery: "eggs",
        schema: z.object({ value: z.string(), search_used: z.boolean().optional() }),
      });
      assert.deepEqual(out, { value: "ok", search_used: true });
      assert.equal(searchCalls, 1);
      const prompts = requests
        .filter((x) => x.url === "/v1/chat/completions")
        .map((x) => JSON.parse(x.body).messages.at(-1).content as string);
      assert.equal(prompts.length, 2);
      assert.ok(prompts.every((prompt) => prompt.startsWith("[UNTRUSTED WEB SEARCH REFERENCES]")));
      assert.equal(prompts[1].slice(0, prompts[0].length), prompts[0]);
    },
  );
});

test("chatJson continues without search context and stamps false on search failure", async () => {
  await withServer(
    async (req, res) => {
      if (req.url === "/v1/models") return sendJson(res, validModels());
      if (req.url === "/v1/chat/completions") return sendJson(res, chatResponse(JSON.stringify({ value: "ok" })));
      sendJson(res, {}, 404);
    },
    async (_base, requests) => {
      const fetchForLlm = globalThis.fetch;
      globalThis.fetch = async (input, init) => {
        if (String(input).startsWith("https://html.duckduckgo.com/")) throw new Error("search failed");
        return fetchForLlm(input, init);
      };
      const out = await chatJson({
        userId: "u",
        kind: "food_vision",
        prompt: "Parse meal",
        webSearchQuery: "eggs",
        schema: z.object({ value: z.string(), search_used: z.boolean().optional() }),
      });
      assert.deepEqual(out, { value: "ok", search_used: false });
      assert.equal(JSON.parse(requests.find((x) => x.url === "/v1/chat/completions")!.body).messages.at(-1).content, "Parse meal");
    },
  );
});
