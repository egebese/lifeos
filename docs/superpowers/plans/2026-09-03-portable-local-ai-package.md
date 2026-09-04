# Portable Local AI Package Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a reusable config-driven installer and provider guide for LifeOS local LLM vision, STT, and TTS deployments.

**Architecture:** Keep provider processes outside Docker. A private shell-style config drives Compose interpolation, the parametrized ASR bridge, and a generated systemd user unit. The installer is idempotent, uses a stable Compose project/volume identity, preserves the config and named volumes, and stages clean source updates; the update wrapper reruns the same path after source updates.

**Tech Stack:** Bash, Docker Compose, systemd user services, Python stdlib bridge, existing TypeScript/Next.js local AI client.

---

## Chunk 1: Config and installer contract

### Task 1: Add failing installer contract tests

**Files:**
- Create: `deploy/tests/test-installer.sh`

- [ ] Write a temporary-fixture test that invokes `deploy/install.sh --dry-run` with a complete config and asserts it reports the configured install directory, provider endpoints, and no secret values.
- [ ] Add a missing-required-value case that exits non-zero and proves Docker/systemd were not invoked.
- [ ] Add a copy/update fixture that uses a temporary target and asserts source files are copied while an existing target config remains unchanged.
- [ ] Run the test before adding the installer; it must fail because the scripts do not exist.

### Task 2: Implement the config-driven installer

**Files:**
- Create: `deploy/config.env.example`
- Create: `deploy/install.sh`
- Create: `deploy/update.sh`
- Create: `deploy/systemd/lifeos-asr-http.service.in`

- [ ] Add a trusted shell-style config template with blank required credentials, generic localhost examples, provider URLs, model id, bridge paths, optional web-search opt-in, and plain-HTTP/TLS notes.
- [ ] Implement strict Bash validation, a `--dry-run` mode, non-secret status output, and dependency checks.
- [ ] Implement source copying with exclusions and no deletion of target files, preserving a pre-existing private config and runtime data.
- [ ] Add a stable configurable Compose volume prefix and render the user systemd unit with configured paths plus an explicit `EnvironmentFile=`.
- [ ] Preflight config/dependencies and Compose before restart; leave persistent state untouched on preflight/build failure.
- [ ] Use configured `FFMPEG_BIN` in the bridge and retry post-start health checks until the app is ready.
- [ ] Enforce mode 600 on the private config, reject a config located inside the source tree, and test that the private file is never copied.
- [ ] Enable linger when possible, reload the user manager, and enable/start only the LifeOS bridge.
- [ ] Run Compose with `--env-file` and `up -d --build`; do not remove volumes.
- [ ] Make `update.sh` a small wrapper that reruns the idempotent installer.

### Task 3: Run installer tests and shell checks

- [ ] Run `bash -n deploy/install.sh deploy/update.sh deploy/tests/test-installer.sh`.
- [ ] Run `bash deploy/tests/test-installer.sh`; expected all cases pass.
- [ ] Run the dry-run with a complete generic config and inspect output for secret redaction.

---

## Chunk 2: Provider endpoint portability

### Task 4: Add failing portability tests

**Files:**
- Modify: `lib/ai/client.test.ts`
- Modify: `infra/asr-http/tests/test_server.py`

- [ ] Add a client test proving a non-default configured model id is accepted when the server advertises the exact id and multimodal capability.
- [ ] Add a bridge test proving configured bind/port/Wyoming values are used by the server factory or request path.
- [ ] Add installer/config tests for stable volume names, generic runtime defaults, TTS variable propagation, and dry-run non-invocation of Docker/systemd.
- [ ] Run the focused tests before implementation and confirm the portability cases fail.

### Task 5: Remove hard-coded provider restrictions

**Files:**
- Modify: `lib/ai/client.ts`
- Modify: `infra/asr-http/server.py`
- Modify: `docker-compose.yml`

- [ ] Remove the equality check against the original Qwen model path while retaining exact `/v1/models` id and multimodal metadata validation.
- [ ] Replace personal fallback URLs/model values in `lib/ai/client.ts` with generic localhost/empty fallbacks that fail safely when not configured.
- [ ] Read `ASR_HTTP_HOST`, `ASR_HTTP_PORT`, and `WYOMING_URI` with safe generic defaults; keep English and all existing limits/error mappings.
- [ ] Pass `TTS_BASE_URL` through Compose for provider configuration while documenting that current LifeOS routes do not consume it.
- [ ] Replace personal deployment defaults in Compose with generic localhost examples or required config values, and set explicit volume names from `LIFEOS_VOLUME_PREFIX`.
- [ ] Make model validation accept arbitrary exact configured ids while retaining multimodal capability checks.
- [ ] Run focused tests and confirm portability cases pass.

---

## Chunk 3: Documentation

### Task 6: Document portable hosting and updates

**Files:**
- Modify: `README.md`
- Create: `deploy/README.md`
- Modify: `.env.example`
- Modify: `CONTRIBUTING.md`
- Modify: `SECURITY.md`

- [ ] Make the main README point to the config-driven installer and update flow.
- [ ] Document llama.cpp text/vision hosting with `--mmproj`, exact model-id discovery, GPU offload guidance, and a `/v1/models` check.
- [ ] Document Wyoming NeMo/Parakeet STT hosting, bridge setup, English-only behavior, ffmpeg, token protection, and firewall scope.
- [ ] Document local TTS hosting options and the current lack of a LifeOS speech-output route.
- [ ] Explain that `deploy/config.env` is private, updates preserve it and Docker volumes, and `docker compose down -v` is destructive.
- [ ] Remove remaining personal default values from public examples while preserving backwards compatibility for existing `.env` deployments; keep production cookies Secure and web search opt-in.

---

## Chunk 4: Verification

### Task 7: Run full verification

- [ ] Run shell tests and syntax checks.
- [ ] Run Python ASR tests.
- [ ] Run TypeScript AI/route tests.
- [ ] Run typecheck and production build.
- [ ] Run Compose config with a supplied generic config.
- [ ] Run a local dry-run install into a temporary target and verify rendered unit/config preservation.
- [ ] Check the release worktree is clean except committed changes and no secrets/config files are tracked.
