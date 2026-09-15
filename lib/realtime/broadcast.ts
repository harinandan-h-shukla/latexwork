import "server-only";

// Plain server-only helper — deliberately NOT a "use server" file, since
// this is never called directly from client code, only imported by other
// server-side modules (e.g. sendChatMessage in lib/mock-api/collaboration.ts)
// right after their real Mongo write succeeds. Fire-and-forget: callers
// should `.catch(() => {})` this, never let it fail the actual mutation —
// the realtime-hub push is best-effort UX sugar, the DB write is what
// matters (see lib/cloud-compiler/actions.ts's cloudCompilerEndpoint() for
// the same "throw if misconfigured" idea, except this one must be non-fatal
// even when misconfigured, because chat/comments/etc. must keep working
// with zero realtime-hub deployed).
//
// Protocol (fixed, shared with the separately-built realtime-hub service —
// see /home/harinandan/.claude/plans/cozy-spinning-toucan.md "Spike B"):
//   POST {REALTIME_HUB_URL}/broadcast
//   Authorization: Bearer {REALTIME_HUB_SHARED_SECRET}
//   body: { projectId: string, event: { type: string, ...anything } }

export interface RealtimeChangeEvent {
  type: string;
  [key: string]: unknown;
}

/**
 * Announces "something changed for this project" to realtime-hub. Silently
 * does nothing (no throw) if REALTIME_HUB_URL/REALTIME_HUB_SHARED_SECRET
 * aren't set — realtime push is opt-in infrastructure, not a hard
 * dependency of any mutation that calls this.
 */
export async function broadcastProjectChange(
  projectId: string,
  event: RealtimeChangeEvent
): Promise<void> {
  const url = process.env.REALTIME_HUB_URL;
  const secret = process.env.REALTIME_HUB_SHARED_SECRET;
  if (!url || !secret) return;

  await fetch(`${url.replace(/\/$/, "")}/broadcast`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ projectId, event }),
  });
}
