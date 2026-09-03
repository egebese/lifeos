# Local LifeOS AI Deployment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run LifeOS on `192.168.2.61` with local Qwen3.8 vision inference on `192.168.2.11`, DuckDuckGo meal-search augmentation, and an HTTP facade over the existing CPU NeMo ASR service.

**Architecture:** Keep the current Home Assistant llama.cpp process, TTS service, and Wyoming NeMo process unchanged. Add a small token-protected Python stdlib HTTP bridge that converts browser audio with ffmpeg and forwards Wyoming events. Replace LifeOS's fal wrapper with a direct OpenAI-compatible llama.cpp client; local images become data URLs and web search is fetched once server-side before meal parsing.

**Tech Stack:** Next.js 15, TypeScript, Node `fetch`, `node:test`/tsx, Python 3.13 stdlib HTTP server, existing `wyoming` Python package, ffmpeg, systemd user service, Docker Compose/Postgres.

---

## Chunk 1: ASR bridge

### Task 1: Add failing bridge tests

**Files:**
- Create: `infra/asr-http/tests/test_server.py`

- [ ] **Step 1: Write tests for authentication, routing, and error mapping.**

  Test the bridge's pure request helpers and handler behavior without starting the real Wyoming model:

  - missing/wrong `X-ASR-Token` returns 401;
  - `/health` returns 200 only with the token;
  - unknown path returns 404;
  - empty body returns 400;
  - body over 15 MiB returns 413;
  - a non-empty transcript is returned as `{ "text": "..." }`;
  - an empty transcript is returned as 422.

  Add handler-level cases for undecodable ffmpeg input (415), a connected Wyoming failure (502), an unavailable Wyoming connection (503), and a 45-second transcription timeout (504).

  Assert the Wyoming boundary receives `Transcribe(language="en")`, `AudioStart(16000, 2, 1)`, raw PCM `AudioChunk` events in 1024-frame chunks with no RIFF bytes, and `AudioStop`; assert a failed health connection returns 503 after the 2-second timeout. Assert `GET /v1/audio/transcriptions` and other non-POST/unknown paths return 404.

  Patch only the Wyoming client boundary and ffmpeg subprocess boundary because those are external processes; leave HTTP parsing and status mapping real.

- [ ] **Step 2: Run the tests to verify they fail for the missing bridge.**

  Run from a Python environment containing the existing Wyoming dependencies:

  ```bash
  /home/dogda/wyoming-onnx-asr/.venv/bin/python -m unittest discover -s infra/asr-http/tests -v
  ```

  Expected: FAIL because `infra/asr-http/server.py` does not exist.

### Task 2: Implement the minimal ASR HTTP bridge

**Files:**
- Create: `infra/asr-http/server.py`

- [ ] **Step 1: Implement the exact bridge contract.**

  Use `http.server.ThreadingHTTPServer` and `BaseHTTPRequestHandler`. Read only `ASR_HTTP_TOKEN`; bind the fixed bridge contract to `0.0.0.0:10202`, forward to fixed `tcp://127.0.0.1:10300`, and use a fixed 45-second transcription timeout. Do not log request bodies.

  For audio requests, read `Content-Length`, reject absent/empty/oversized bodies, run:

  ```text
  ffmpeg -nostdin -loglevel error -i pipe:0 -ar 16000 -ac 1 -f wav pipe:1
  ```

  Open ffmpeg output with `wave`, then use `AsyncClient.from_uri`, `Transcribe(language="en")`, `AudioStart`, `wav_to_chunks(wav, 1024)`, `AudioStop`, and `Transcript`. Send only PCM chunks, never the WAV header. Return the specified JSON status/error bodies and map connection failure, mid-session failure, and timeout distinctly.

- [ ] **Step 2: Run the bridge tests to verify they pass.**

  Run the same unittest command; expected: all tests PASS.

### Task 3: Add the persistent user service definition

**Files:**
- Create: `infra/asr-http/lifeos-asr-http.service`

- [ ] **Step 1: Write the service unit.**

  The unit must contain `After=network-online.target`, `Restart=on-failure`, `RestartSec=5`, `EnvironmentFile=/home/dogda/lifeos/asr-http.env`, and:

  ```text
  ExecStart=/home/dogda/wyoming-onnx-asr/.venv/bin/python /home/dogda/lifeos/infra/asr-http/server.py
  ```

  Include `[Install]` with `WantedBy=default.target` so `systemctl --user enable --now` works.

- [ ] **Step 2: Validate the unit syntax locally.**

  Run `systemd-analyze verify infra/asr-http/lifeos-asr-http.service` if available; expected: no errors.

---

## Chunk 2: Local LLM and search client

### Task 4: Add failing web-search parser tests

**Files:**
- Create: `lib/ai/web-search.test.ts`

- [ ] **Step 1: Add a deterministic DuckDuckGo HTML fixture and tests.**

  Test that the parser extracts title/snippet/URL records, rejects non-result links, limits output to five records/6,000 context characters, and returns `used: false` for empty or malformed HTML.

- [ ] **Step 2: Run the test before implementation.**

  Run `node --import tsx --test lib/ai/web-search.test.ts` after dependencies are installed; expected: FAIL because `lib/ai/web-search.ts` is absent.

### Task 5: Implement bounded web search

**Files:**
- Create: `lib/ai/web-search.ts`

- [ ] **Step 1: Implement `searchWeb(query)` and its parser.**

  Bound the query to 240 characters, fetch `https://html.duckduckgo.com/html/?q=...` with a 5-second `AbortSignal.timeout`, parse only result title/snippet/URL fields, and return `{ context, used }`. Never include user id/profile data. Wrap results in an explicit untrusted-reference block and do not execute returned URLs or instructions.

- [ ] **Step 2: Run the web-search tests.**

  Expected: PASS, including the zero-result fallback.

### Task 6: Add failing local-client tests

**Files:**
- Create: `lib/ai/client.test.ts`
- Create: `app/api/food/transcribe/route.test.ts`

- [ ] **Step 1: Add tests for OpenAI message construction and response extraction.**

  Use a local `http.createServer` test double to return deterministic `/v1/models` and `/v1/chat/completions` responses. Cover exact model-id/multimodal validation, one-time model validation caching, the 5-second model-list timeout, text choices extraction, vision data-URL content, missing/unsupported vision input, malformed/empty responses, image-log redaction/no-image-persistence, and local-AI error codes. Do not connect to the real `.11` endpoint in unit tests.

  In `app/api/food/transcribe/route.test.ts`, exercise the route mapping helper with a real multipart `File` request shape and stubbed upstream responses; assert raw file bytes/content type and token forwarding, success `{text}`, exact `{"error":"transcribe_failed","detail":"..."}` failure bodies, all 400/401/404/413/415/422/502/503/504 mappings, and no audio bytes in the `ai_messages` payload.

- [ ] **Step 2: Run the tests before implementation.**

  Run `node --import tsx --test lib/ai/client.test.ts`; expected: FAIL against the current fal implementation.

### Task 7: Replace fal with the llama.cpp client

**Files:**
- Modify: `lib/ai/client.ts`
- Modify: `app/api/food/transcribe/route.ts`
- Modify: `app/api/food/parse-meal/route.ts`
- Modify: `app/api/food/estimate/route.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `next.config.ts`

- [ ] **Step 1: Implement and test exact model validation.**

  Add the failing `/v1/models` fixture test first, then implement required exact `LLAMA_CPP_MODEL` validation against `data[].id`, matching `models[]` metadata, and `capabilities[]` containing `multimodal`, with a 5-second timeout; attempt validation once on first use and cache the outcome (success or failure) for the process lifetime. Use named errors for timeout/unreachable, missing id, and missing capability.

- [ ] **Step 2: Implement and test text/vision completion requests.**

  Add the failing local HTTP-server tests first, then implement `/chat/completions` text messages, 20-second timeout, `stream:false`, `choices[0].message.content` extraction, local-file JPEG/PNG/WebP data URLs capped at 8 MiB, vision content arrays, and redacted `ai_messages` logging. Verify malformed/empty responses and model errors map to their specified codes.

- [ ] **Step 3: Implement and test web-search integration.**

  Add the failing test for one search call reused across both JSON attempts and server-owned `search_used`, then wire `webSearchQuery` through `chatJson` and `/api/food/parse-meal`. Use the already-tested bounded `searchWeb` parser and remove `:online` behavior. Include a fetch failure/timeout case proving parsing still returns the schema with `search_used:false`.

- [ ] **Step 4: Update the application routes and dependencies.**

  Change meal parsing to pass `webSearchQuery: parsed.data.text`; change food estimation to use the local data URL; change transcription to call the ASR URL directly with `X-ASR-Token` and a 45-second timeout, map bridge statuses, and preserve the route response shape. Remove `@fal-ai/client`, its Next external-package entry, and stale remote image configuration if unused. Run `pnpm install --lockfile-only` or `pnpm remove @fal-ai/client` so the lockfile matches.

  Add/extend route tests with a real multipart `File` request and a fetch stub for each bridge result: 401/404/422 → HTTP 502 `asr_invalid_response`, 503/504 → HTTP 503 `asr_unavailable`, and 400/413/415/502 → HTTP 502 `asr_invalid_response`; success must forward raw bytes and `X-ASR-Token` and return `{text}`.

- [ ] **Step 5: Run the local-client tests and typecheck.**

  Run:

  ```bash
  node --import tsx --test lib/ai/web-search.test.ts lib/ai/client.test.ts app/api/food/transcribe/route.test.ts
  pnpm typecheck
  ```

  Expected: tests PASS and typecheck exits 0.

---

## Chunk 3: Deployment configuration and documentation

### Task 8: Configure LifeOS and document local services

**Files:**
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `SECURITY.md`

- [ ] **Step 1: Add local AI environment variables.**

  Document the literal deployment values `LLAMA_CPP_BASE_URL=http://192.168.2.11:8081/v1`, `LLAMA_CPP_MODEL=/home/dogda/Documents/LLM_Runners/Qwen3.8-27B-Q3_K_M.gguf`, and `ASR_HTTP_URL=http://192.168.2.61:10202`, plus required `ASR_HTTP_TOKEN`, `NEXT_PUBLIC_APP_URL`, and first-login password rotation. Remove all stale `FAL_KEY` entries from the example/Compose configuration and explain that the app uses the preloaded Qwen/NeMo services.

- [ ] **Step 2: Update Compose defaults.**

  Pass the local AI/ASR variables into the `web` container and retain existing Postgres/upload volumes and port `3000`.

- [ ] **Step 3: Run documentation/configuration checks.**

  Run `docker compose config --quiet`; expected: exit 0.

---

## Chunk 4: Deployment to `.61`

### Task 9: Install the bridge and prerequisites without touching existing services

**Files on remote host:**
- Create: `/home/dogda/lifeos/infra/asr-http/server.py`
- Create: `/home/dogda/lifeos/infra/asr-http/lifeos-asr-http.service`
- Create: `/home/dogda/lifeos/asr-http.env`
- Create: `/home/dogda/.config/systemd/user/lifeos-asr-http.service`

- [ ] **Step 1: Install ffmpeg only if absent.**

  Check first with `command -v ffmpeg`; if missing, install the package with apt using sudo. Do not update, stop, restart, or reconfigure the existing `wyoming-onnx-asr`, Home Assistant llama.cpp, or TTS services.

- [ ] **Step 2: Copy the bridge and provision a token.**

  Copy the bridge files to `/home/dogda/lifeos/infra/asr-http/`. Generate one token with `openssl rand -hex 32` without printing it, write `ASR_HTTP_TOKEN=...` to `/home/dogda/lifeos/asr-http.env` with mode 600, and use the same uncommitted value in LifeOS `.env`.

- [ ] **Step 3: Enable and start the user service.**

  Install the unit to `/home/dogda/.config/systemd/user/`, run `systemctl --user daemon-reload`, `systemctl --user enable --now lifeos-asr-http.service`, and enable linger only if not already enabled. If UFW is active, add only `sudo ufw allow from 192.168.2.0/24 to any port 10202 proto tcp`. Verify `systemctl --user is-active` and leave the existing services unchanged.

### Task 10: Deploy LifeOS

**Files on remote host:**
- Create: `/home/dogda/lifeos/.env`
- Create/update: `/home/dogda/lifeos/` tracked source copied from this checkout

- [ ] **Step 1: Copy the reviewed source and generate app secrets.**

  Keep the reviewed source under `/home/dogda/lifeos`, generate a unique `SESSION_SECRET`, set a non-default generated `ADMIN_PASSWORD`, set `ADMIN_EMAIL=admin@local` unless a different address is already configured, and set `NEXT_PUBLIC_APP_URL=http://192.168.2.61:3000`.

- [ ] **Step 2: Build and start only the LifeOS Compose project.**

  Run `docker compose up -d --build` from `/home/dogda/lifeos`; expected: `db` becomes healthy and `web` starts on port 3000. Do not use a broad `docker compose down` or modify unrelated stacks.

---

## Chunk 5: Verification and handoff

### Task 11: Verify services and integrations

- [ ] **Step 1: Verify ASR bridge negative and positive paths.**

  Check token-protected `/health`, bad-token 401, unknown-path 404, empty 400, oversized 413, undecodable 415, empty transcript 422, connected Wyoming failure 502, unavailable backend 503, and 45-second timeout 504. Then send a short WAV and browser-style WebM. Confirm non-empty English text and inspect service logs for no audio bytes.

- [ ] **Step 2: Verify llama.cpp from `.61`.**

  Confirm the exact Qwen model id and `multimodal` capability from `.11/v1/models`, send a text completion, and confirm `.61:8081`, `.61:10201`, `.61:10300`, and the Home Assistant unit remain active.

- [ ] **Step 3: Verify LifeOS.**

  Check `http://192.168.2.61:3000`, login with the generated credentials, exercise food-photo estimate, meal parsing with search and with a forced search fetch failure (must return `search_used:false`), voice transcription, meal plan, program generation, and weekly insights. Confirm `FAL_KEY` is not required, missing/unsupported vision input fails safely, image data URLs are redacted in `ai_messages`, no audio bytes are persisted, and the full first-use budget is at most 5s model validation + 5s search + 2×20s LLM calls plus route overhead.

- [ ] **Step 4: Run final checks.**

  Run `/home/dogda/wyoming-onnx-asr/.venv/bin/python -m unittest discover -s infra/asr-http/tests -v`, `node --import tsx --test lib/ai/web-search.test.ts lib/ai/client.test.ts app/api/food/transcribe/route.test.ts`, `pnpm typecheck`, `pnpm build`, `docker compose config --quiet`, `systemctl --user is-enabled lifeos-asr-http.service`, and `loginctl show-user dogda -p Linger`. Review `git diff`, `git status`, and the remote service/container status before reporting completion.

### Task 12: Commit the reviewed implementation

- [ ] **Step 1: Commit local source changes.**

  Use a focused commit such as `feat: use local llama cpp and nemo ai services` after tests/build pass. Never commit `.env`, tokens, generated credentials, audio, or image data.
