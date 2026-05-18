// Demo stub: no real auth. Always returns a single "demo-user".

export type SessionUser = {
  id: string;
  email: string;
  role: "admin";
  locale: "en";
  passwordHash: string;
  createdAt: Date;
};

const DEMO_USER: SessionUser = {
  id: "demo-user",
  email: "demo@lifeos.local",
  role: "admin",
  locale: "en",
  passwordHash: "",
  createdAt: new Date(),
};

export const SESSION_COOKIE = "lt_sid";

export type SessionContext = {
  user: SessionUser;
  sessionId: string;
};

export async function getSession(): Promise<SessionContext | null> {
  return { user: DEMO_USER, sessionId: "demo" };
}

export async function requireSession(): Promise<SessionContext> {
  return { user: DEMO_USER, sessionId: "demo" };
}

export async function createSession(_args?: {
  userId: string;
  userAgent?: string;
  ip?: string;
}): Promise<string> {
  return "demo";
}

export async function destroySession(): Promise<void> {
  // no-op
}

export async function readSealedCookie(
  _value: string,
): Promise<{ sid: string; uid: string } | null> {
  return null;
}
