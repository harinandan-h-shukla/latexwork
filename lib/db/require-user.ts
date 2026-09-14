import "server-only";
import { getSession } from "@/lib/session";

/** Throws if there's no real logged-in session — every real (non-mock) data action needs this. */
export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session.userId) throw new Error("Not signed in");
  return session.userId;
}
