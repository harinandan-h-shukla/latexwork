import crypto from "node:crypto";

// Pure token-signing logic, deliberately split out of lib/realtime/actions.ts
// (a "use server" file). Next.js Server Action modules may only export async
// functions with a Server-Action-compatible signature — a plain sync helper
// like base64url() can't live there, so the actual signing logic (which a
// throwaway script needs to call directly, outside any Next.js/request
// context, to self-verify the format) lives in this ordinary module instead.
//
// Token format (fixed protocol — must match realtime-hub's verifier exactly,
// see /home/harinandan/.claude/plans/cozy-spinning-toucan.md "Spike B"):
//   base64url(JSON.stringify({projectId, userId, exp})) + "." +
//   base64url(HMAC-SHA256(secret, thatBase64urlPayload))
// where `exp` is a unix-ms timestamp and the HMAC is computed over the
// *base64url-encoded* payload string (not the raw JSON string).

export interface RealtimeTokenPayload {
  projectId: string;
  userId: string;
  exp: number;
}

/** base64url, no padding, per the fixed protocol ("+"→"-", "/"→"_", strip "="). */
export function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

/** Signs `payload` into the fixed subscribe-token wire format described above. */
export function signRealtimeToken(payload: RealtimeTokenPayload, secret: string): string {
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(payloadB64).digest();
  return `${payloadB64}.${base64url(signature)}`;
}
