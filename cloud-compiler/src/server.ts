import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import express, { NextFunction, Request, Response } from "express";

import { ServiceConfig } from "./config";
import { discoverCompilers, getCachedCompilers } from "./discovery";
import { BuildManager } from "./buildManager";
import { requireSharedSecret } from "./auth";
import { isRateLimited } from "./rateLimit";
import { synctexForward, synctexInverse } from "./synctex";

const SERVICE_VERSION = "0.1.0";

export async function createServer(config: ServiceConfig): Promise<{ app: express.Express; buildManager: BuildManager }> {
  await discoverCompilers();

  const app = express();
  app.disable("x-powered-by");

  // First line of defense against oversized payloads; BuildManager re-checks
  // the true sum of file content sizes against maxProjectSizeMb independently.
  const bodyLimitMb = Math.max(config.maxProjectSizeMb * 2, 10);
  app.use(express.json({ limit: `${bodyLimitMb}mb` }));

  const buildManager = new BuildManager(config, () => getCachedCompilers() ?? []);

  // No auth required: Fly.io's health checks hit this before the app is
  // known-good, and it reveals nothing sensitive (no project/build data).
  app.get("/health", (_req, res) => {
    res.json({ ok: true, version: SERVICE_VERSION });
  });

  app.use(requireSharedSecret(config));

  app.get("/version", async (req: Request, res: Response) => {
    const refresh = req.query.refresh === "true";
    const compilers = await discoverCompilers(refresh);
    res.json({
      serviceVersion: SERVICE_VERSION,
      platform: `${os.platform()} ${os.release()} (${os.arch()})`,
      compilers,
    });
  });

  app.post("/compile", async (req: Request, res: Response) => {
    const callerId = typeof req.body?.callerId === "string" ? req.body.callerId : undefined;
    if (!callerId) {
      res.status(400).json({ error: "callerId is required." });
      return;
    }
    if (isRateLimited(callerId, config.rateLimitMax, config.rateLimitWindowMs)) {
      res.status(429).json({ error: "Too many compile requests — slow down and try again shortly." });
      return;
    }
    const result = await buildManager.queueCompile(req.body);
    res.status(result.status).json(result.payload);
  });

  // GET requests carry no body, so ownership is checked via a query param
  // instead — still just an extra defense-in-depth layer against a bug in
  // the (trusted) Next.js caller, not a substitute for the bearer-token gate
  // above, which is what actually keeps end users out of this API entirely.
  function callerFromQuery(req: Request): string | undefined {
    return typeof req.query.callerId === "string" ? req.query.callerId : undefined;
  }

  app.get("/status/:buildId", (req: Request, res: Response) => {
    const callerId = callerFromQuery(req);
    if (!callerId || !buildManager.isOwnedBy(req.params.buildId, callerId)) {
      res.status(404).json({ error: `Unknown buildId: ${req.params.buildId}` });
      return;
    }
    const record = buildManager.getBuild(req.params.buildId);
    if (!record) {
      res.status(404).json({ error: `Unknown buildId: ${req.params.buildId}` });
      return;
    }
    res.json(buildManager.toStatusResponse(record));
  });

  app.post("/cancel/:buildId", (req: Request, res: Response) => {
    const callerId = typeof req.body?.callerId === "string" ? req.body.callerId : undefined;
    if (!callerId) {
      res.status(400).json({ error: "callerId is required." });
      return;
    }
    const result = buildManager.cancelBuild(req.params.buildId, callerId);
    res.status(result.status).json(result.payload);
  });

  // SyncTeX — only works within the same short window a build's workDir
  // still exists (see SUCCESS_CLEANUP_DELAY_MS in buildManager.ts), unlike
  // local-agent where the project's directory is long-lived.
  app.get("/synctex/forward/:buildId", async (req: Request, res: Response) => {
    const callerId = callerFromQuery(req);
    const record = buildManager.getBuild(req.params.buildId);
    const file = typeof req.query.file === "string" ? req.query.file : undefined;
    const line = Number(req.query.line);
    if (!callerId || !record || record.callerId !== callerId || !record.pdfPath || !file || !Number.isFinite(line)) {
      res.status(404).json({ error: "No SyncTeX data available for that build." });
      return;
    }
    // Must mirror buildManager.ts's compile cwd exactly — see that file's
    // comment on the same computation.
    const mainDir = path.dirname(record.mainFile);
    const cwd = mainDir === "." ? record.workDir : path.join(record.workDir, mainDir);
    const sourceRel = mainDir === "." ? file : path.relative(mainDir, file);
    const result = await synctexForward(cwd, record.pdfPath, sourceRel, line);
    if (!result) {
      res.status(404).json({ error: "No SyncTeX mapping for that location." });
      return;
    }
    res.json(result);
  });

  app.get("/synctex/inverse/:buildId", async (req: Request, res: Response) => {
    const callerId = callerFromQuery(req);
    const record = buildManager.getBuild(req.params.buildId);
    const page = Number(req.query.page);
    const x = Number(req.query.x);
    const y = Number(req.query.y);
    if (
      !callerId ||
      !record ||
      record.callerId !== callerId ||
      !record.pdfPath ||
      ![page, x, y].every(Number.isFinite)
    ) {
      res.status(404).json({ error: "No SyncTeX data available for that build." });
      return;
    }
    const mainDir = path.dirname(record.mainFile);
    const cwd = mainDir === "." ? record.workDir : path.join(record.workDir, mainDir);
    const result = await synctexInverse(cwd, record.pdfPath, page, x, y);
    if (!result) {
      res.status(404).json({ error: "No SyncTeX mapping for that location." });
      return;
    }
    res.json({ ...result, file: mainDir === "." ? result.file : path.join(mainDir, result.file) });
  });

  app.get("/builds/:buildId/output.pdf", (req: Request, res: Response) => {
    const callerId = callerFromQuery(req);
    const record = buildManager.getBuild(req.params.buildId);
    if (
      !callerId ||
      !record ||
      record.callerId !== callerId ||
      record.status !== "success" ||
      !record.pdfPath ||
      !fs.existsSync(record.pdfPath)
    ) {
      res.status(404).json({ error: "No successful build output available for this buildId." });
      return;
    }
    res.setHeader("Content-Type", "application/pdf");
    fs.createReadStream(record.pdfPath).pipe(res);
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (!err) return next();
    if (err.type === "entity.too.large") {
      res.status(413).json({ error: "Request payload too large." });
      return;
    }
    res.status(400).json({ error: err.message || "Invalid request." });
  });

  return { app, buildManager };
}
