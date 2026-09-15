import http from "node:http";
import express, { NextFunction, Request, Response } from "express";

import { ServiceConfig } from "./config";
import { requireSharedSecret } from "./auth";
import { Hub, HubEvent } from "./hub";

const SERVICE_VERSION = "0.1.0";

/**
 * Mirrors cloud-compiler/src/server.ts's createServer(config) shape
 * ({ app, ... }, routes wired here, shared-secret middleware mounted after
 * the unauthenticated /health route). Unlike cloud-compiler, this service
 * also needs a raw http.Server to mount the WebSocket upgrade handler on
 * (the `ws` package's WebSocketServer attaches to an http.Server instance,
 * not to an Express app directly) — so, like local-agent/src/server.ts, the
 * http.Server is created here and returned alongside `app`/`hub`; cli.ts
 * calls `server.listen(...)` rather than `app.listen(...)`.
 */
export function createServer(config: ServiceConfig): { app: express.Express; hub: Hub; server: http.Server } {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  const server = http.createServer(app);
  const hub = new Hub(server, "/events", config.sharedSecret);

  // No auth required: this mirrors cloud-compiler's /health — used for
  // Fly.io health checks before the app is known-good, and reveals nothing
  // sensitive (no project data, no roster contents).
  app.get("/health", (_req, res) => {
    res.json({ ok: true, version: SERVICE_VERSION });
  });

  app.use(requireSharedSecret(config));

  // Server-to-server only (the Next.js app, after a real Mongo write
  // succeeds). `event` is forwarded to subscribers exactly as given —
  // JSON.stringify(event) verbatim, no wrapping/envelope added — so the
  // caller's `event.type` is what clients see on the wire.
  app.post("/broadcast", (req: Request, res: Response) => {
    const projectId = req.body?.projectId;
    const event = req.body?.event as HubEvent | undefined;
    if (typeof projectId !== "string" || !projectId) {
      res.status(400).json({ error: "projectId is required." });
      return;
    }
    if (!event || typeof event !== "object" || typeof event.type !== "string") {
      res.status(400).json({ error: "event (with a string `type` field) is required." });
      return;
    }
    hub.broadcast(projectId, event);
    res.status(200).json({ ok: true });
  });

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (!err) return next();
    if (err.type === "entity.too.large") {
      res.status(413).json({ error: "Request payload too large." });
      return;
    }
    res.status(400).json({ error: err.message || "Invalid request." });
  });

  return { app, hub, server };
}
