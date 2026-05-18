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

If you deploy LifeOS publicly:

1. **Rotate `SESSION_SECRET` and `ADMIN_PASSWORD` immediately** after first login.
2. Put the app behind HTTPS (Cloudflare proxy or Let's Encrypt at your reverse proxy).
3. Restrict `POST /api/whoop/sync` if you expose it for cron — use Whoop's webhook with HMAC verification instead where possible.
4. Use a strong `FAL_KEY` and treat it as a billing credential — anyone with the key can spend your fal credits.
5. Back up your Postgres volume regularly. The `ai_messages` table contains your prompts and responses.
6. Keep Docker images updated — `docker compose pull && docker compose up -d --build` periodically.
