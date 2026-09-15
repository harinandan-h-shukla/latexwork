"use server";

// Mints short-lived tokens a browser client can use to subscribe to a
// project's realtime-hub WebSocket feed (see lib/realtime/use-realtime-project.ts,
// the client-side consumer, and lib/realtime/broadcast.ts, the server-side
// sender). Split into its own "use server" module rather than added to
// lib/mock-api/collaboration.ts directly, same rationale as
// lib/cloud-compiler/actions.ts: this genuinely needs the server boundary
// for a secret the browser must never see (REALTIME_HUB_SHARED_SECRET).

import { getDb } from "@/lib/db/mongoose";
import { requireProjectAccess, isRealProjectId } from "@/lib/mock-api/collaboration";
import { signRealtimeToken } from "@/lib/realtime/token";

/** Short-lived: 5 minutes, per the fixed protocol. */
const TOKEN_TTL_MS = 5 * 60 * 1000;

/**
 * Mints a realtime-hub subscribe token for `projectId`, after confirming the
 * caller (via requireUserId(), wrapped inside requireProjectAccess()) has
 * real access to it — same owner-or-collaborator check every other
 * real-project read in lib/mock-api/collaboration.ts already uses, reused
 * here rather than re-derived so this can't silently drift from it.
 *
 * Throws (never returns a token) when:
 * - REALTIME_HUB_SHARED_SECRET isn't configured — realtime push isn't set up.
 * - `projectId` isn't a real (Mongo ObjectId) project — legacy mock/demo
 *   projects never broadcast (see sendChatMessage), so there's nothing to
 *   subscribe to.
 * - the caller has no access to `projectId` (requireProjectAccess throws).
 *
 * Callers (the useRealtimeProject hook) are expected to catch this and just
 * skip live updates — collaboration features must keep working with zero
 * realtime-hub deployed, or for demo projects, or for any other reason this
 * throws.
 */
export async function mintRealtimeToken(projectId: string): Promise<string> {
  const secret = process.env.REALTIME_HUB_SHARED_SECRET;
  if (!secret) {
    throw new Error(
      "REALTIME_HUB_SHARED_SECRET is not set. Add it to .env.local to mint realtime subscribe tokens."
    );
  }
  if (!(await isRealProjectId(projectId))) {
    throw new Error("Realtime updates are only available for real (non-demo) projects.");
  }

  await getDb();
  const userId = await requireProjectAccess(projectId);

  return signRealtimeToken({ projectId, userId, exp: Date.now() + TOKEN_TTL_MS }, secret);
}
