import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sealData, unsealData } from "iron-session";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sessions, users, type User } from "@/lib/db/schema";

export const SESSION_COOKIE = "lt_sid";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year

type SealedPayload = { sid: string; uid: string };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET missing or too short (>=32 chars)");
  }
  return s;
}

export async function createSession(args: {
  userId: string;
  userAgent?: string;
  ip?: string;
}) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const [row] = await db
    .insert(sessions)
    .values({
      userId: args.userId,
      expiresAt,
      userAgent: args.userAgent ?? null,
      ip: args.ip ?? null,
    })
    .returning({ id: sessions.id });

  const sealed = await sealData({ sid: row.id, uid: args.userId } satisfies SealedPayload, {
    password: secret(),
    ttl: SESSION_TTL_SECONDS,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return row.id;
}

export async function readSealedCookie(value: string): Promise<SealedPayload | null> {
  try {
    return await unsealData<SealedPayload>(value, {
      password: secret(),
      ttl: SESSION_TTL_SECONDS,
    });
  } catch {
    return null;
  }
}

export type SessionContext = {
  user: User;
  sessionId: string;
};

export async function getSession(): Promise<SessionContext | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const payload = await readSealedCookie(raw);
  if (!payload) return null;

  const rows = await db
    .select({
      sessionId: sessions.id,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, payload.sid), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (rows.length === 0) return null;
  return { user: rows[0].user, sessionId: rows[0].sessionId };
}

export async function requireSession(): Promise<SessionContext> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function destroySession() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    const payload = await readSealedCookie(raw);
    if (payload) {
      await db.delete(sessions).where(eq(sessions.id, payload.sid));
    }
  }
  jar.delete(SESSION_COOKIE);
}
