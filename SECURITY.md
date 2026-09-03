# Security Policy

## Supported versions

LifeOS is a rolling-release self-hosted project. Only the `main` branch receives security fixes. If you're running an older commit, please rebase / pull first.

## Reporting a vulnerability

**Do not open a public GitHub issue.**

Email the maintainer privately, or use GitHub's [private vulnerability reporting](https://github.com/egebese/lifeos/security/advisories/new) on this repo.

Please include:

- A description of the issue.
- Steps to reproduce (or a proof-of-concept).
- Affected version / commit SHA.
- Impact assessment (what an attacker can do).

You'll get an acknowledgement within **72 hours** and, where possible, a fix or mitigation plan within **14 days**.

## Scope

In scope:

- Authentication bypass / privilege escalation
- Session token leakage
- SQL injection, XSS, CSRF
- Sensitive data leakage in logs, AI prompts, or `ai_messages` rows
- Whoop OAuth / webhook signature bypass
- Container / Dockerfile misconfigurations
- Dependency vulnerabilities with a realistic exploit path

Out of scope:

- Issues that require physical access to the server
- DoS via raw request volume (it's a single-admin app — rate-limit at your reverse proxy)
- Self-XSS that requires the admin to paste hostile content into their own UI
- Outdated dependencies without a demonstrable exploit

## Hardening checklist for self-hosters

Local AI runs through the preloaded Qwen vision llama.cpp service and the existing NeMo/Wyoming ASR service behind the local HTTP bridge; no external AI API key is required.

If you deploy LifeOS publicly:

1. **Rotate `SESSION_SECRET` and `ADMIN_PASSWORD` immediately** after first login.
2. Put the app behind HTTPS (Cloudflare proxy or Let's Encrypt at your reverse proxy).
3. Restrict `POST /api/whoop/sync` if you expose it for cron — use Whoop's webhook with HMAC verification instead where possible.
4. **Protect `ASR_HTTP_TOKEN`** — use a random value, store it only in the bridge environment file and uncommitted LifeOS `.env`, and keep the bridge reachable only from the trusted LAN.
5. Keep the llama.cpp and ASR endpoints on the trusted LAN; do not expose ports `8081`, `10202`, or the existing Wyoming port `10300` directly to the Internet.
6. Back up your Postgres volume regularly. The `ai_messages` table contains your prompts and responses.
7. Keep Docker images updated — `docker compose pull && docker compose up -d --build` periodically.
