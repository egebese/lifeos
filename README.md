<div align="center">

# LifeOS

**Self-hosted personal life tracker — workouts, nutrition, Whoop, AI photo calories, AI diet planner.**

One [fal.ai](https://fal.ai) key powers every AI feature in the app.

[**▸ Live demo**](https://lifeos-demo-nu.vercel.app)  ·  data stays in your browser, nothing is sent server-side

[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)
![Node 20+](https://img.shields.io/badge/node-%E2%89%A520-black)
![Next.js 15](https://img.shields.io/badge/next.js-15-black)
![PostgreSQL 16](https://img.shields.io/badge/postgres-16-black)
![fal.ai](https://img.shields.io/badge/AI-fal.ai-black)

</div>

---

LifeOS is the self-hosted personal OS I built for myself: log every workout, every meal, every Whoop recovery score, and let one AI provider — **fal.ai** — handle the smart parts (photo-to-calories, meal planning, weekly insights, voice-to-meal transcription, workout program generation).

It is intentionally **single-admin**: one user, one Postgres database, one Docker container, one fal.ai key. Deploy it on a $5 VPS, point a domain at it, and you own all your fitness/nutrition data. MIT licensed.

> The project is internally called `lifetracker` (package name, docker volumes, db name). The public/repo name is **LifeOS**.

## Why fal.ai is the centerpiece

Every AI surface in this app — without exception — runs through a single [`FAL_KEY`](https://fal.ai/dashboard/keys). One key, one bill, one provider, the entire feature set lights up:

| Feature | fal.ai endpoint | Model | What it does |
|---|---|---|---|
| **Food photo → macros** | `openrouter/router/vision` | `anthropic/claude-sonnet-4.6` | Snap a meal, get kcal/protein/carbs/fat breakdown |
| **Free-form meal parser** | `openrouter/router` | `anthropic/claude-sonnet-4.6` | "two eggs and toast" → structured macros |
| **Voice → meal log** | `fal-ai/wizper` v3 | Wizper (multilingual, TR/EN) | Record audio, parse the meal from speech |
| **Meal planner (3–14 days)** | `openrouter/router` | `anthropic/claude-sonnet-4.6` | Goal + preferences + pantry → full plan + shopping list |
| **Workout program generator** | `openrouter/router` | `anthropic/claude-sonnet-4.6` | Goal/level/equipment → multi-day periodised program |
| **Weekly insights** | `openrouter/router` | `anthropic/claude-sonnet-4.6` | Highlights / warnings / recommendations from 30d data |
| **File storage (uploaded photos)** | `fal.storage.upload()` | — | Persistent CDN URLs for vision inputs |
| **Web-search augmentation** | `openrouter/router` (`:online` suffix) | OpenRouter web variant | Up-to-date brand/portion lookups when needed |

**Why this matters as a self-hoster:**

- **One bill, one dashboard.** No juggling OpenAI + Anthropic + ElevenLabs + S3 accounts. Top up [fal.ai credits](https://fal.ai/dashboard/billing), every feature works.
- **Provider-agnostic routing.** fal's [OpenRouter integration](https://fal.ai/models/openrouter) lets you swap `anthropic/claude-sonnet-4.6` for any other supported model (GPT-5, Llama 4, Gemini 3 Pro, etc.) by passing a different `model` string — no code or env changes required beyond the default.
- **Every call is metered & logged.** `lib/ai/client.ts` records every prompt, response, model id, and cost (in cents) into the `ai_messages` table. You can audit and budget per-feature.
- **No vendor lock-in.** All AI calls go through one thin wrapper. Replace `@fal-ai/client` with a different provider in ~30 lines if you ever want to.

Get a key at <https://fal.ai/dashboard/keys>, drop it in `.env`, done.

## Features

| | |
|---|---|
| 🏋️ **Workouts** | 1,324 exercises (en/tr) from the public `exercises-dataset`; create programs, log sets/reps/weight with RPE, rest timer, last-time overlay, Epley 1RM tracking |
| 🍳 **Food** | Manual log + AI photo estimate + voice transcription. Daily macros, kcal targets vs actuals |
| 🥗 **Plan & Shop** | AI-generated 3–14 day meal plans factoring goal, liked/disliked/allergy preferences, pantry inventory, and recently-eaten meals. Shopping list auto-subtracts pantry |
| ⌚ **Whoop** | OAuth2 connect, full sync (recovery, sleep, strain, workouts, body measurement), HMAC webhook, daily safety-net cron |
| 🧮 **Analysis** | Weight 90d · kcal 14d · recovery 30d · workout volume 30d. AI weekly insights |
| 🔐 **Auth** | Single admin, argon2id hash, sealed httpOnly cookie, 1-year expiry |
| 🎨 **UI** | Nothing-design aesthetic — Doto/Space Grotesk/Space Mono, OLED black, dot-matrix accents. Mobile-first with bottom nav + safe-area insets |

## Quick start (local)

Requires **Node 20+**, **pnpm**, and **Docker** (for Postgres).

```bash
git clone https://github.com/egebese/lifeos.git
cd lifeos

cp .env.example .env
# Edit at minimum:
#   SESSION_SECRET   → openssl rand -base64 64
#   ADMIN_EMAIL      → your email
#   ADMIN_PASSWORD   → first-boot password (change from /profile after login)
#   FAL_KEY          → https://fal.ai/dashboard/keys
```

### Option A — full Docker stack (fastest)

```bash
docker compose up --build
# → migrate → bootstrap admin → seed 1,324 exercises → seed templates → next start
# Open http://localhost:3000  ·  login with ADMIN_EMAIL / ADMIN_PASSWORD
```

### Option B — dev mode (hot reload)

```bash
docker compose up -d db          # just Postgres
pnpm install
pnpm db:migrate
pnpm bootstrap:admin
pnpm seed:exercises              # ~1,324 records, ~30s, needs internet
pnpm dev                         # http://localhost:3000
```

## Environment variables

| Var | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `SESSION_SECRET` | ✅ | 64-byte base64 (`openssl rand -base64 64`) for `iron-session` |
| `ADMIN_EMAIL` | ✅ | Bootstraps the single admin account on first boot |
| `ADMIN_PASSWORD` | ✅ | First-boot password (change from `/profile` after) |
| `FAL_KEY` | ✅ (for AI) | [fal.ai API key](https://fal.ai/dashboard/keys) — powers **all** AI features |
| `WHOOP_CLIENT_ID` | optional | From [developer.whoop.com](https://developer.whoop.com) |
| `WHOOP_CLIENT_SECRET` | optional | OAuth client secret |
| `WHOOP_REDIRECT_URI` | optional | `https://yourdomain.com/api/whoop/callback` |
| `WHOOP_WEBHOOK_SECRET` | optional | Only if you set a custom webhook secret in the Whoop portal |
| `NEXT_PUBLIC_APP_URL` | optional | Public origin (used in OAuth + emails) |
| `ENABLE_CRON` | optional | `1` to enable background jobs in the Node process |
| `TZ` | optional | Defaults to `Europe/Istanbul`; set yours |
| `UPLOADS_DIR` | optional | Defaults to `./uploads` locally, `/data/uploads` in Docker |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Next.js 15 (App Router, RSC, TypeScript strict)             │
│  └─ app/(app)/*    UI routes (mobile-first, Nothing design)  │
│  └─ app/api/*      REST handlers                             │
│                                                              │
│  lib/ai/client.ts  ──────────────►  fal.ai                   │
│    chat()                            openrouter/router       │
│    vision()                          openrouter/router/vision│
│    transcribeAudio()                 fal-ai/wizper           │
│    uploadBuffer()                    fal.storage             │
│                                                              │
│  lib/auth         iron-session + argon2id                    │
│  lib/whoop        OAuth2 + HMAC webhook + sync               │
│  lib/nutrition    macro math, BMR/TDEE, Epley 1RM            │
│                                                              │
│  Drizzle ORM  ────────────────►  PostgreSQL 16               │
│  node-cron    ────────────────►  daily Whoop safety-net      │
└──────────────────────────────────────────────────────────────┘
```

## Deploy on Coolify

Tested on Coolify v4 with a single $5 VPS:

1. **DB** — create a Postgres 16 resource; copy connection string.
2. **App** — from your GitHub repo, build pack = Dockerfile, port `3000`.
3. **Volume** — persistent volume mounted at `/data/uploads`.
4. **Env vars** — `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `FAL_KEY`, optional `WHOOP_*`, `ENABLE_CRON=1`, `TZ=Europe/Istanbul`.
5. **Domain** — your subdomain with Let's Encrypt.
6. **DNS** (Cloudflare) — A record → Coolify server IP (proxy=off until LE cert issues, then flip on).
7. **Whoop (optional)** — register at [developer.whoop.com](https://developer.whoop.com) with redirect URI `https://<your-domain>/api/whoop/callback`. Add webhook `https://<your-domain>/api/whoop/webhook` and copy secret into env.
8. **Daily Whoop sync (optional)** — schedule a Coolify task hitting `POST /api/whoop/sync` once a day (or rely on webhook + manual sync).

First deploy auto-runs: migrate → bootstrap admin → seed 1,324 exercises → seed default 3-day full-body template.

## Tech

- **Runtime** — Next.js 15 App Router · React 19 · TypeScript strict · Tailwind v4
- **Database** — PostgreSQL 16 · Drizzle ORM 0.36
- **AI** — `@fal-ai/client` 1.6 → fal.ai (`openrouter/router`, `openrouter/router/vision`, `fal-ai/wizper`)
- **Auth** — `iron-session` (sealed httpOnly cookies) · `@node-rs/argon2`
- **UI** — `recharts` charts · `lucide-react` icons · `vaul` drawers · custom Nothing-design system
- **Jobs** — `node-cron` (Whoop daily safety-net)
- **Package manager** — pnpm 9.15

## Contributing

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, code conventions, and what kinds of changes are in/out of scope.

Note that LifeOS is intentionally **single-user**. If you want multi-tenant SaaS-style auth, please open an issue first — that direction will likely live in a fork.

## Security

If you find a security issue, **do not open a public issue**. See [SECURITY.md](SECURITY.md) for disclosure instructions.

## Data attribution

Exercise dataset (1,324 records with images + GIFs) is from [`hasaneyldrm/exercises-dataset`](https://github.com/hasaneyldrm/exercises-dataset). It is provided for educational use only — media is referenced directly from the upstream raw URLs and not redistributed in this repo. Verify license alignment before commercial use.

Nothing-style visual language inspired by the [Nothing Design Skill](https://github.com/dominikmartn/nothing-design-skill) (Swiss + industrial). Fonts: Doto, Space Grotesk, Space Mono — all open-source.

## License

MIT — see [LICENSE](LICENSE).

Built with ❤️ by [@egebese](https://github.com/egebese), powered by [fal.ai](https://fal.ai).
