// Whoop OAuth 2.0 helpers
// docs: https://developer.whoop.com/docs/developing/oauth

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { whoopTokens } from "@/lib/db/schema";

const AUTHORIZE_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";

export const WHOOP_SCOPES = [
  "read:recovery",
  "read:cycles",
  "read:sleep",
  "read:workout",
  "read:profile",
  "read:body_measurement",
  "offline",
].join(" ");

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function buildAuthorizeUrl(state: string): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env("WHOOP_CLIENT_ID"));
  url.searchParams.set("redirect_uri", env("WHOOP_REDIRECT_URI"));
  url.searchParams.set("scope", WHOOP_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  token_type: string;
};

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: env("WHOOP_REDIRECT_URI"),
    client_id: env("WHOOP_CLIENT_ID"),
    client_secret: env("WHOOP_CLIENT_SECRET"),
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Whoop token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function refreshToken(refresh: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refresh,
    client_id: env("WHOOP_CLIENT_ID"),
    client_secret: env("WHOOP_CLIENT_SECRET"),
    scope: WHOOP_SCOPES,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Whoop refresh failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function saveTokens(userId: string, tok: TokenResponse) {
  const expiresAt = new Date(Date.now() + tok.expires_in * 1000);
  await db
    .insert(whoopTokens)
    .values({
      userId,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      expiresAt,
      scope: tok.scope ?? null,
    })
    .onConflictDoUpdate({
      target: whoopTokens.userId,
      set: {
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token,
        expiresAt,
        scope: tok.scope ?? null,
      },
    });
}

export async function ensureFreshToken(userId: string): Promise<string | null> {
  const rows = await db
    .select()
    .from(whoopTokens)
    .where(eq(whoopTokens.userId, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  if (row.expiresAt.getTime() - Date.now() > 60_000) {
    return row.accessToken;
  }
  // Refresh
  const tok = await refreshToken(row.refreshToken);
  await saveTokens(userId, tok);
  return tok.access_token;
}
