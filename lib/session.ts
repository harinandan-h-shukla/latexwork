import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";

export interface SessionData {
  userId: string | null;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "",
  cookieName: "inkwell_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

/** Non-sensitive, client-readable hint cookie so client components can render
 * "logged in" UI state without ever seeing the real (encrypted, httpOnly)
 * session. Never used for authorization — only for cosmetic UI branching. */
export const HAS_SESSION_COOKIE = "inkwell_has_session";

export async function getSession(): Promise<IronSession<SessionData>> {
  if (!sessionOptions.password) {
    throw new Error("SESSION_SECRET is not set. Add it to .env.local.");
  }
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function setSessionUser(userId: string): Promise<void> {
  const session = await getSession();
  session.userId = userId;
  await session.save();

  const cookieStore = await cookies();
  cookieStore.set(HAS_SESSION_COOKIE, "1", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const session = await getSession();
  session.destroy();

  const cookieStore = await cookies();
  cookieStore.delete(HAS_SESSION_COOKIE);
}
