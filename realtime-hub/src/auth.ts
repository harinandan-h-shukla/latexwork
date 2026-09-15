import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { ServiceConfig } from "./config";

/**
 * Server-to-server auth (POST /broadcast). The only intended caller is the
 * Next.js server, never an end user's browser directly — mirrors
 * cloud-compiler/src/auth.ts's requireSharedSecret verbatim. A constant-time
 * comparison avoids leaking the secret one byte at a time via response-time
 * differences.
 */
export function requireSharedSecret(config: ServiceConfig) {
  const expected = Buffer.from(config.sharedSecret);
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.header("authorization") ?? "";
    const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
    const providedBuf = Buffer.from(provided);
    const ok = providedBuf.length === expected.length && crypto.timingSafeEqual(providedBuf, expected);
    if (!ok) {
      res.status(401).json({ error: "Missing or invalid Authorization bearer token." });
      return;
    }
    next();
  };
}

/**
 * Client WebSocket subscribe auth.
 *
 * A Mongo ObjectId `projectId` is not a secret (guessable/loggable), so
 * `local-agent`'s zero-auth "subscribe to any projectId" model is a real IDOR
 * once this service is on the public internet. Instead, subscribing requires
 * a short-lived signed token proving the client's caller (the Next.js server,
 * after checking real project access via `assertProjectAccess`) actually
 * vouches for that specific (projectId, userId) pair.
 *
 * This is intentionally NOT a JWT library — just a minimal JWT-*shaped*
 * token, since both minting (Next.js server, a separate task) and
 * verification (this service) are code you control and both already share
 * `REALTIME_HUB_SHARED_SECRET`. No asymmetric crypto is needed.
 *
 * ## Token format (the Next.js-side minting code MUST match this exactly)
 *
 *   token = base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)
 *
 *   payload = {
 *     projectId: string,   // the project this token grants a subscribe to
 *     userId: string,      // the authenticated user this token was minted for
 *     exp: number,         // unix ms timestamp; token is invalid at/after this
 *   }
 *
 *   signature = HMAC-SHA256(
 *     key: REALTIME_HUB_SHARED_SECRET (utf8),
 *     message: base64url(JSON payload)   // i.e. sign the FIRST segment's
 *                                         // base64url text, not the raw JSON
 *                                         // bytes and not the full token
 *   )
 *
 * `JSON payload` is `JSON.stringify({ projectId, userId, exp })` with no
 * required key order (verification re-parses it as JSON) — but the HMAC is
 * computed over the exact base64url TEXT of that serialization, so the
 * minting side must base64url-encode first, then sign that string, exactly
 * like `mintSubscribeToken` below does.
 *
 * Verification rejects (see verifySubscribeToken) if: the signature doesn't
 * verify, `exp` is in the past, or the token's `projectId` doesn't match the
 * `projectId` the client is trying to subscribe to.
 */
export interface SubscribeTokenPayload {
  projectId: string;
  userId: string;
  exp: number;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function signPayloadSegment(payloadSegment: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payloadSegment).digest("base64url");
}

/**
 * Mints a subscribe token. This is the function the Next.js side needs to
 * reproduce byte-for-byte (see the format doc above) — kept here so this
 * service can mint its own tokens for local testing/verification without a
 * second implementation to keep in sync.
 */
export function mintSubscribeToken(projectId: string, userId: string, secret: string, ttlMs: number): string {
  const payload: SubscribeTokenPayload = {
    projectId,
    userId,
    exp: Date.now() + ttlMs,
  };
  const payloadSegment = base64url(JSON.stringify(payload));
  const signatureSegment = signPayloadSegment(payloadSegment, secret);
  return `${payloadSegment}.${signatureSegment}`;
}

export type VerifyResult =
  | { ok: true; payload: SubscribeTokenPayload }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" | "project-mismatch" };

/**
 * Verifies a subscribe token against the projectId the client is trying to
 * subscribe to. Rejects on: malformed token, bad signature, expiry, or a
 * projectId mismatch (a valid token for project A must not authorize
 * subscribing to project B).
 */
export function verifySubscribeToken(token: string, expectedProjectId: string, secret: string): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return { ok: false, reason: "malformed" };
  }
  const [payloadSegment, signatureSegment] = parts;

  const expectedSignature = signPayloadSegment(payloadSegment, secret);
  const providedBuf = Buffer.from(signatureSegment);
  const expectedBuf = Buffer.from(expectedSignature);
  const signatureOk =
    providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);
  if (!signatureOk) {
    return { ok: false, reason: "bad-signature" };
  }

  let payload: SubscribeTokenPayload;
  try {
    const decoded = Buffer.from(payloadSegment, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.projectId !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return { ok: false, reason: "malformed" };
    }
    payload = parsed as SubscribeTokenPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (Date.now() >= payload.exp) {
    return { ok: false, reason: "expired" };
  }
  if (payload.projectId !== expectedProjectId) {
    return { ok: false, reason: "project-mismatch" };
  }

  return { ok: true, payload };
}
