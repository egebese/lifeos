<div align="center">

# LifeOS

**Self-hosted personal life tracker — workouts, nutrition, Whoop, local AI photo calories, and diet planning.**

Local Qwen vision and NeMo/Wyoming speech services power the AI features; no external AI API key is needed.

[**▸ Live demo**](https://lifeos-demo-nu.vercel.app)  ·  data stays in your browser, nothing is sent server-side

[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)
![Node 20+](https://img.shields.io/badge/node-%E2%89%A520-black)
![Next.js 15](https://img.shields.io/badge/next.js-15-black)
![PostgreSQL 16](https://img.shields.io/badge/postgres-16-black)
![Local AI](https://img.shields.io/badge/AI-local-black)

![Dashboard](docs/screenshots/dashboard.png)

</div>

## Screens

| | |
|---|---|
| ![Workouts](docs/screenshots/workouts.png) | ![Food log](docs/screenshots/food.png) |
| Workouts — log sets, rest timer, programs, 1RM tracking | Food log — manual or AI photo, daily macros vs target |
| ![Whoop](docs/screenshots/whoop.png) | ![Programs](docs/screenshots/programs.png) |
| Whoop — 30-day recovery / sleep / strain history | Programs — saved splits or AI-generated |

<details>
<summary>Mobile (the app is mobile-first)</summary>

| Dashboard | Food log |
|---|---|
| <img src="docs/screenshots/mobile-dashboard.png" width="320" /> | <img src="docs/screenshots/mobile-food.png" width="320" /> |

</details>


---

LifeOS is the self-hosted personal OS I built for myself: log every workout, every meal, every Whoop recovery score, and let local AI handle the smart parts (photo-to-calories, meal planning, weekly insights, voice-to-meal transcription, and workout program generation).

It is intentionally **single-admin**: one user, one Postgres database, one Docker container, and local AI services on the LAN. Keep your fitness/nutrition data on your own network. MIT licensed.

> The project is internally called `lifetracker` (package name, docker volumes, db name). The public/repo name is **LifeOS**.

## Local AI services

LifeOS connects to user-hosted local providers configured in
`deploy/config.env`. It needs an OpenAI-compatible llama.cpp server for text
and vision plus the included token-protected HTTP bridge in front of any
Wyoming-compatible English STT server. TTS can be recorded in the config for
future spoken-output clients; the current LifeOS UI does not call TTS.

No external AI API key is needed, and the installer does not download model
weights or replace provider runtimes.

Meal-text parsing performs at most one DuckDuckGo HTML search (up to five
results and 6,000 characters). Results are marked as untrusted reference
context, never executed, and a search failure still returns a parse with
`search_used: false`.

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
#   ASR_HTTP_TOKEN   → the same token configured for the ASR HTTP bridge
```

### Option A — full Docker stack (fastest)

```bash
docker compose --env-file .env up --build
# → migrate → bootstrap admin → seed 1,324 exercises → seed templates → next start
# Open NEXT_PUBLIC_APP_URL · login with ADMIN_EMAIL / ADMIN_PASSWORD
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
| `ADMIN_PASSWORD` | ✅ | First-boot password; rotate it from `/profile` immediately after first login |
| `LIFEOS_VOLUME_PREFIX` | ✅ (deployment) | Stable prefix for named Postgres/uploads volumes; do not change after install |
| `LLAMA_CPP_BASE_URL` | ✅ (deployment) | OpenAI-compatible llama.cpp `/v1` URL |
| `LLAMA_CPP_MODEL` | ✅ (deployment) | Exact model id returned by llama.cpp `/v1/models`; must advertise `multimodal` |
| `ASR_HTTP_URL` | ✅ (deployment) | Token-protected ASR bridge URL |
| `ASR_HTTP_TOKEN` | ✅ | Shared secret for the ASR HTTP bridge; keep it out of Git and logs |
| `TTS_BASE_URL` | optional | User-hosted TTS URL; informational until LifeOS adds speech output |
| `WHOOP_CLIENT_ID` | optional | From [developer.whoop.com](https://developer.whoop.com) |
| `WHOOP_CLIENT_SECRET` | optional | OAuth client secret |
| `WHOOP_REDIRECT_URI` | optional | `https://yourdomain.com/api/whoop/callback` |
| `WHOOP_WEBHOOK_SECRET` | optional | Only if you set a custom webhook secret in the Whoop portal |
| `NEXT_PUBLIC_APP_URL` | ✅ (deployment) | Browser-visible public origin |
| `ENABLE_CRON` | optional | `1` to enable background jobs in the Node process |
| `TZ` | optional | Defaults to `UTC`; set yours |
| `UPLOADS_DIR` | optional | Defaults to `./uploads` locally, `/data/uploads` in Docker |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Next.js 15 (App Router, RSC, TypeScript strict)             │
│  └─ app/(app)/*    UI routes (mobile-first, Nothing design)  │
│  └─ app/api/*      REST handlers                             │
│                                                              │
│  lib/ai/client.ts  ──────────────►  llama.cpp                │
│    chat()                            configured local model  │
│    vision()                          configured vision model │
│    transcribeAudio()  ───────────►  ASR HTTP bridge           │
│                                                              │
│  lib/auth         iron-session + argon2id                    │
│  lib/whoop        OAuth2 + HMAC webhook + sync               │
│  lib/nutrition    macro math, BMR/TDEE, Epley 1RM            │
│                                                              │
│  Drizzle ORM  ────────────────►  PostgreSQL 16               │
│  node-cron    ────────────────►  daily Whoop safety-net      │
└──────────────────────────────────────────────────────────────┘
```

## Deploy with configurable local AI

Use the reusable package in [`deploy/README.md`](deploy/README.md):

```bash
cp deploy/config.env.example "$HOME/.config/lifeos.env"
chmod 600 "$HOME/.config/lifeos.env"
# Edit the URLs, exact model id, local ASR Python path, credentials, and ports.
./deploy/install.sh "$HOME/.config/lifeos.env"
```

The installer keeps the private config outside the checkout, renders the
ASR bridge user service, validates the Compose file, and starts LifeOS. It
does not stop or reconfigure existing llama.cpp, STT, or TTS processes. For
updates, update the checkout and rerun:

```bash
./deploy/update.sh "$HOME/.config/lifeos.env"
```

The config and named volumes are preserved. Do not run `docker compose down
-v`; that deletes the database and uploads volumes.

## Tech

- **Runtime** — Next.js 15 App Router · React 19 · TypeScript strict · Tailwind v4
- **Database** — PostgreSQL 16 · Drizzle ORM 0.36
- **AI** — OpenAI-compatible local llama.cpp Qwen vision model plus the local ASR HTTP bridge
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

Built with ❤️ by [@egebese](https://github.com/egebese).
