import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { ServiceConfig } from "./config";

/**
 * The only intended caller of this service is the Next.js server (never an
 * end user's browser directly) — local-agent has no equivalent because its
 * only gate is CORS origin-checking, which is meaningless for a
 * server-to-server call with no browser Origin header at all. A constant-time
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
