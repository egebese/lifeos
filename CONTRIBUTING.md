# Contributing to LifeOS

Thanks for your interest! LifeOS is a self-hosted, single-admin personal tracker — small in scope on purpose. PRs and issues are welcome; please read this first to save us both time.

## Scope — what's in / what's out

**In scope** (PRs likely to be accepted):

- Bug fixes (auth, sync, parsing, UI regressions)
- Performance & a11y improvements
- New exercise dataset translations / corrections
- New `lib/ai/prompts.ts` improvements (better food/plan/program prompts)
- Documentation, screenshots, deployment guides for other PaaS (Railway, Fly, Render, Hetzner Coolify, etc.)
- Local AI integrations and improvements to the configured model/service pipelines
- New chart types in `/analysis`
- Whoop sync edge cases

**Out of scope** (please open an issue / discussion first; will likely be declined as a PR):

- Multi-tenant / multi-user auth — LifeOS is intentionally single-admin. If you need this, fork it.
- Replacing the local AI stack with another provider at the framework level. (Adding a *configurable* alternative behind the same `chat()` / `vision()` interface is fine; discuss the design first.)
- Switching the database away from Postgres.
- Mobile native apps (iOS/Android shells). The PWA is intentionally web-first.
- Major UI redesigns away from the Nothing-design aesthetic.

If unsure, **open an issue before writing code**. Saves rejection cycles.

## Dev setup

```bash
git clone https://github.com/egebese/lifeos.git
cd lifeos

cp .env.example .env
# Fill in the required values in `.env`; for a full local-AI deployment use
# `deploy/config.env.example` and `deploy/install.sh`.

docker compose up -d db
pnpm install
pnpm db:migrate
pnpm bootstrap:admin
pnpm seed:exercises
pnpm dev
```

The default `.env.example` uses generic local endpoints. Set the exact
llama.cpp model id and `ASR_HTTP_TOKEN` before testing AI features; no
external AI API key is needed. AI calls are logged to the `ai_messages` table
for troubleshooting and audit. The portable deployment package and provider
hosting guide are in [`deploy/README.md`](deploy/README.md).

## Code conventions

- **TypeScript strict.** No `any` unless absolutely necessary (and comment why).
- **Server Components by default.** Drop to `"use client"` only when you need state, effects, or browser APIs.
- **Drizzle for all DB access.** No raw SQL except in migrations.
- **Zod schemas at API boundaries.** Look at `lib/ai/schemas.ts` for the pattern.
- **No new env vars without a `.env.example` or deployment-config update.**
- **AI calls go through `lib/ai/client.ts`.** Keep route handlers on the shared local llama.cpp/ASR client so errors and safe request metadata are recorded in `ai_messages`.
- **Mobile-first.** Test at 375px width before desktop. Use the existing `components/nothing/*` primitives where possible.

## Before you push

```bash
pnpm lint
pnpm typecheck
pnpm build
```

All three must pass. CI runs the same on PRs.

## Commit / PR style

- One concern per PR. A bug fix + a refactor + a new feature = three PRs.
- Commit messages: imperative present tense — `add voice transcription endpoint`, not `added` / `adds`.
- PR description: what changed, why, and **how you tested it** (screenshots for UI, curl/log snippets for API).
- If you touched a local AI endpoint or model integration, mention the endpoint/model and any latency or resource impact in the PR.

## Reporting bugs

Open an issue with:

1. What you did (step-by-step).
2. What you expected.
3. What actually happened.
4. Environment: Node version, deploy target (Docker/Coolify/local), browser if UI.
5. Relevant logs — `docker compose logs web` is your friend.

**Do not include `ASR_HTTP_TOKEN`, session cookies, or DB connection strings** in issues. Redact them.

## Reporting security issues

See [SECURITY.md](SECURITY.md). **Do not** open a public issue for security.

## License

By contributing you agree your contributions are MIT-licensed under the same terms as the rest of the project.
