import { ensureFreshToken } from "./oauth";

// WHOOP v2 base. v1 was deprecated in 2025; v1/cycle still returns scored cycles
// for some apps, but v1/recovery, v1/activity/sleep, v1/activity/workout often
// return empty pages — which is why a /v1 sync reports "strain ok, sleep 0,
// recovery 0, workouts 0". Use v2 everywhere.
const BASE = "https://api.prod.whoop.com/developer";

// Loose shape — Whoop responses are JSON with vendor-specific keys.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WhoopRecord = any;

async function authedFetch(userId: string, path: string, init?: RequestInit) {
  const token = await ensureFreshToken(userId);
  if (!token) throw new Error("whoop_not_connected");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`whoop ${path} -> ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function fetchProfile(userId: string) {
  return authedFetch(userId, `/v2/user/profile/basic`);
}

export async function fetchBodyMeasurement(userId: string) {
  return authedFetch(userId, `/v2/user/measurement/body`);
}

type Page<T> = { records: T[]; next_token?: string };

async function paginate<T>(
  userId: string,
  path: string,
  qs: Record<string, string> = {},
  maxPages = 40,
): Promise<T[]> {
  const out: T[] = [];
  let nextToken: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const url = new URL(`${BASE}${path}`);
    Object.entries(qs).forEach(([k, v]) => url.searchParams.set(k, v));
    if (nextToken) url.searchParams.set("nextToken", nextToken);
    const token = await ensureFreshToken(userId);
    if (!token) throw new Error("whoop_not_connected");
    const res = await fetch(url.toString(), {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`whoop ${path} -> ${res.status}: ${await res.text()}`);
    }
    const page = (await res.json()) as Page<T>;
    out.push(...(page.records ?? []));
    if (!page.next_token) break;
    nextToken = page.next_token;
  }
  return out;
}

export function fetchRecovery(userId: string, sinceIso: string) {
  return paginate<WhoopRecord>(userId, `/v2/recovery`, { start: sinceIso, limit: "25" });
}
export function fetchSleep(userId: string, sinceIso: string) {
  return paginate<WhoopRecord>(userId, `/v2/activity/sleep`, { start: sinceIso, limit: "25" });
}
export function fetchCycles(userId: string, sinceIso: string) {
  return paginate<WhoopRecord>(userId, `/v2/cycle`, { start: sinceIso, limit: "25" });
}
export function fetchWorkouts(userId: string, sinceIso: string) {
  return paginate<WhoopRecord>(userId, `/v2/activity/workout`, { start: sinceIso, limit: "25" });
}
