import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import express, { NextFunction, Request, Response } from "express";
import cors, { CorsOptions } from "cors";

import { AgentConfig } from "./config";
import { discoverCompilers, getCachedCompilers } from "./discovery";
import { BuildManager } from "./buildManager";
import { WsHub } from "./wsHub";

function readAgentVersion(): string {
  try {
    const pkgPath = path.join(__dirname, "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const AGENT_VERSION = readAgentVersion();

export async function createServer(config: AgentConfig): Promise<{ server: http.Server; buildManager: BuildManager }> {
  // Probe compilers once at startup; cached thereafter (GET /version reuses this).
  await discoverCompilers();

  const app = express();

  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      // Requests with no Origin header (curl, server-to-server, same-origin) are allowed;
      // browser cross-origin requests must come from an explicitly allowed origin.
      if (!origin || config.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin not allowed: ${origin}`));
      }
    },
  };
  app.use(cors(corsOptions));

  // First line of defense against oversized payloads; the build manager re-checks
  // the true sum of file content sizes against maxProjectSizeMb independently.
  const bodyLimitMb = Math.max(config.maxProjectSizeMb * 2, 10);
  app.use(express.json({ limit: `${bodyLimitMb}mb` }));

  const server = http.createServer(app);
  const wsHub = new WsHub(server, "/events");

  const buildManager = new BuildManager(
    config,
    () => getCachedCompilers() ?? [],
    (projectId, event) => wsHub.broadcast(projectId, event)
  );

  app.get("/version", async (req: Request, res: Response) => {
    const refresh = req.query.refresh === "true";
    const compilers = await discoverCompilers(refresh);
    res.json({
      agentVersion: AGENT_VERSION,
      platform: `${os.platform()} ${os.release()} (${os.arch()})`,
      compilers,
    });
  });

  app.post("/compile", async (req: Request, res: Response) => {
    const result = await buildManager.queueCompile(req.body);
    res.status(result.status).json(result.payload);
  });

  app.get("/status/:buildId", (req: Request, res: Response) => {
    const record = buildManager.getBuild(req.params.buildId);
    if (!record) {
      res.status(404).json({ error: `Unknown buildId: ${req.params.buildId}` });
      return;
    }
    res.json(buildManager.toStatusResponse(record));
  });

  app.post("/cancel/:buildId", (req: Request, res: Response) => {
    const result = buildManager.cancelBuild(req.params.buildId);
    res.status(result.status).json(result.payload);
  });

  app.get("/builds/:buildId/output.pdf", (req: Request, res: Response) => {
    const record = buildManager.getBuild(req.params.buildId);
    if (!record || record.status !== "success" || !record.pdfPath || !fs.existsSync(record.pdfPath)) {
      res.status(404).json({ error: "No successful build output available for this buildId." });
      return;
    }
    res.setHeader("Content-Type", "application/pdf");
    fs.createReadStream(record.pdfPath).pipe(res);
  });

  app.delete("/project/:projectId", (req: Request, res: Response) => {
    const result = buildManager.cancelProject(req.params.projectId);
    res.status(result.status).json(result.payload);
  });

  // Surface body-parser/CORS errors as clean JSON instead of Express's default HTML.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (!err) return next();
    if (err.type === "entity.too.large") {
      res.status(413).json({ error: "Request payload too large." });
      return;
    }
    if (typeof err.message === "string" && err.message.startsWith("Origin not allowed")) {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(400).json({ error: err.message || "Invalid request." });
  });

  return { server, buildManager };
}
