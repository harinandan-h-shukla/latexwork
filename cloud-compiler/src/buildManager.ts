import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import treeKill from "tree-kill";

import { ServiceConfig } from "./config";
import { isSafeRelativePath, resolveInside } from "./paths";
import { parseLatexLog } from "./logParser";
import { sandboxCommand } from "./sandbox";
import {
  BuildRecord,
  BuildStatus,
  CompilerInfo,
  EngineName,
  InputFile,
  LogEntry,
  StatusResponse,
} from "./types";

type ValidationError = { status: 400 | 413; error: string };

interface ValidatedCompile {
  projectId: string;
  callerId: string;
  mainFile: string;
  files: InputFile[];
  compiler: EngineName;
  options: Required<Pick<import("./types").CompileOptions, "draftMode" | "shellEscape">> & { timeoutMs: number };
}

const ENGINE_FLAG: Record<EngineName, string> = {
  pdflatex: "-pdf",
  xelatex: "-xelatex",
  lualatex: "-lualatex",
};

/** Grace window after a successful build before its workDir (including the
 * output PDF) is deleted — long enough for the Next.js server's poll loop to
 * see "success" and fetch `pdfUrl` afterward. Failed/timed-out/cancelled
 * builds have no PDF to serve, so those clean up immediately instead. */
const SUCCESS_CLEANUP_DELAY_MS = 5 * 60_000;

export class BuildManager {
  private builds = new Map<string, BuildRecord>();
  private counter = 0;
  private activeCount = 0;
  private pending: Array<() => void> = [];

  constructor(
    private config: ServiceConfig,
    private getCompilers: () => CompilerInfo[]
  ) {}

  getBuild(buildId: string): BuildRecord | undefined {
    return this.builds.get(buildId);
  }

  toStatusResponse(record: BuildRecord): StatusResponse {
    return {
      buildId: record.buildId,
      projectId: record.projectId,
      status: record.status,
      startedAt: record.startedAt,
      finishedAt: record.finishedAt,
      durationMs: record.durationMs,
      pdfUrl: record.status === "success" && record.pdfPath ? `/builds/${record.buildId}/output.pdf` : undefined,
      log: record.log,
    };
  }

  private nextBuildId(): string {
    this.counter += 1;
    return `cbuild-${Date.now()}-${this.counter}`;
  }

  private validate(body: any): ValidationError | ValidatedCompile {
    if (!body || typeof body !== "object") {
      return { status: 400, error: "Request body must be a JSON object." };
    }
    const { projectId, callerId, mainFile, files, compiler, options } = body;

    if (typeof projectId !== "string" || projectId.length === 0) {
      return { status: 400, error: "projectId is required." };
    }
    if (typeof callerId !== "string" || callerId.length === 0) {
      return { status: 400, error: "callerId is required." };
    }
    if (typeof mainFile !== "string" || !isSafeRelativePath(mainFile)) {
      return { status: 400, error: "mainFile is required and must be a safe relative path (no absolute paths or '..')." };
    }
    if (!Array.isArray(files) || files.length === 0) {
      return { status: 400, error: "files must be a non-empty array." };
    }
    if (files.length > this.config.maxFiles) {
      return { status: 413, error: `Too many files: ${files.length} exceeds the limit of ${this.config.maxFiles}.` };
    }

    let totalBytes = 0;
    for (const f of files) {
      if (!f || typeof f !== "object" || typeof f.path !== "string" || typeof f.content !== "string") {
        return { status: 400, error: "Each entry in files must have a string 'path' and string 'content'." };
      }
      if (!isSafeRelativePath(f.path)) {
        return { status: 400, error: `Unsafe file path (must be relative, no '..' segments): ${f.path}` };
      }
      if (f.encoding !== undefined && f.encoding !== "utf8" && f.encoding !== "base64") {
        return { status: 400, error: `Unsupported encoding "${f.encoding}" for file ${f.path}; use "utf8" or "base64".` };
      }
      totalBytes += Buffer.byteLength(f.content, "utf8");
    }
    const maxBytes = this.config.maxProjectSizeMb * 1024 * 1024;
    if (totalBytes > maxBytes) {
      return {
        status: 413,
        error: `Total project size (${totalBytes} bytes) exceeds the limit of ${this.config.maxProjectSizeMb}MB.`,
      };
    }

    if (compiler !== "pdflatex" && compiler !== "xelatex" && compiler !== "lualatex") {
      return { status: 400, error: 'compiler must be one of "pdflatex", "xelatex", "lualatex".' };
    }
    const compilers = this.getCompilers();
    const compilerInfo = compilers.find((c) => c.name === compiler);
    if (!compilerInfo || !compilerInfo.available) {
      return { status: 400, error: `Compiler "${compiler}" is not installed/available on this service.` };
    }
    const latexmkInfo = compilers.find((c) => c.name === "latexmk");
    if (!latexmkInfo || !latexmkInfo.available) {
      return { status: 400, error: "latexmk is required to run compiles but is not available on this service." };
    }

    const rawOptions = options && typeof options === "object" ? options : {};
    const requestedTimeout =
      typeof rawOptions.timeoutMs === "number" && Number.isFinite(rawOptions.timeoutMs) && rawOptions.timeoutMs > 0
        ? rawOptions.timeoutMs
        : this.config.defaultTimeoutMs;
    const timeoutMs = Math.min(requestedTimeout, this.config.maxTimeoutMs);

    return {
      projectId,
      callerId,
      mainFile,
      files,
      compiler,
      options: {
        draftMode: !!rawOptions.draftMode,
        shellEscape: !!rawOptions.shellEscape,
        timeoutMs,
      },
    };
  }

  async queueCompile(
    body: any
  ): Promise<{ status: 202; payload: { buildId: string; status: "queued" } } | { status: 400 | 413; payload: { error: string } }> {
    const validated = this.validate(body);
    if ("error" in validated) {
      return { status: validated.status, payload: { error: validated.error } };
    }

    const buildId = this.nextBuildId();
    // Per-BUILD directory, never reused — see the comment on BuildRecord.workDir
    // in types.ts for why this differs from local-agent's per-project reuse.
    const workDir = path.join(this.config.workDir, buildId);
    const outDir = path.join(workDir, ".build");

    const record: BuildRecord = {
      buildId,
      projectId: validated.projectId,
      callerId: validated.callerId,
      status: "queued",
      startedAt: null,
      finishedAt: null,
      log: [],
      mainFile: validated.mainFile,
      workDir,
      outDir,
      settled: false,
    };
    this.builds.set(buildId, record);

    this.pending.push(() => {
      this.runBuild(record, validated).catch((err) => {
        this.settle(record, "error", [
          { severity: "error", message: `Internal service error: ${err?.message ?? String(err)}` },
        ]);
      });
    });
    this.pump();

    return { status: 202, payload: { buildId, status: "queued" } };
  }

  /** Bounded worker pool: starts the next queued build only when a slot is
   * free, so N simultaneous callers can't spawn unbounded compiler processes
   * (local-agent has no equivalent — it only serializes per-project). */
  private pump(): void {
    while (this.activeCount < this.config.maxConcurrentBuilds && this.pending.length > 0) {
      const run = this.pending.shift()!;
      this.activeCount += 1;
      run();
    }
  }

  private async runBuild(record: BuildRecord, validated: ValidatedCompile): Promise<void> {
    try {
      if (record.settled) return; // cancelled before it even started

      await fsp.mkdir(record.workDir, { recursive: true });

      for (const f of validated.files) {
        const dest = resolveInside(record.workDir, f.path);
        if (!dest) {
          this.settle(record, "error", [
            { severity: "error", message: `Refusing to write outside build directory: ${f.path}` },
          ]);
          return;
        }
        await fsp.mkdir(path.dirname(dest), { recursive: true });
        const buffer = f.encoding === "base64" ? Buffer.from(f.content, "base64") : Buffer.from(f.content, "utf8");
        await fsp.writeFile(dest, buffer);
      }

      await fsp.mkdir(record.outDir, { recursive: true });

      if (record.settled) return; // cancelled while writing files

      const compilers = this.getCompilers();
      const latexmkPath = compilers.find((c) => c.name === "latexmk")?.path || "latexmk";

      const latexmkArgs = [
        ENGINE_FLAG[validated.compiler],
        "-interaction=nonstopmode",
        "-file-line-error",
        "-halt-on-error",
        // Fresh workDir every build already means there's no stale-cache
        // risk the way there is in local-agent, but -g costs nothing here
        // (nothing to skip on a first-ever run) and keeps behavior identical
        // if this ever gains directory reuse for speed later.
        "-g",
        `-outdir=${record.outDir}`,
      ];
      if (validated.options.shellEscape) latexmkArgs.push("-shell-escape");
      latexmkArgs.push(validated.mainFile);

      const sandboxed = sandboxCommand(this.config, record.workDir, latexmkPath, latexmkArgs);

      record.status = "running";
      record.startedAt = new Date().toISOString();

      await this.spawnAndWait(record, validated, sandboxed.command, sandboxed.args);
    } finally {
      // Disk cleanup itself is scheduled from settle() (immediate for a
      // failed/timed-out/cancelled build, delayed for a successful one so
      // the PDF can still be fetched) — only the concurrency slot is
      // released unconditionally here.
      this.activeCount -= 1;
      this.pump();
    }
  }

  private spawnAndWait(
    record: BuildRecord,
    validated: ValidatedCompile,
    command: string,
    args: string[]
  ): Promise<void> {
    return new Promise((resolve) => {
      const child = spawn(command, args, { cwd: record.workDir });
      record.pid = child.pid;

      const chunks: string[] = [];
      child.stdout?.on("data", (d) => chunks.push(d.toString()));
      child.stderr?.on("data", (d) => chunks.push(d.toString()));

      record.timeoutHandle = setTimeout(() => {
        if (record.settled) return;
        if (record.pid) treeKill(record.pid, "SIGTERM", () => {});
        this.settle(record, "timeout", [
          { severity: "error", message: `Compile timed out after ${validated.options.timeoutMs}ms and was terminated.` },
        ]);
        resolve();
      }, validated.options.timeoutMs);

      child.on("error", (err) => {
        if (record.settled) {
          resolve();
          return;
        }
        this.settle(record, "error", [
          { severity: "error", message: `Failed to start sandboxed compile: ${err.message}` },
        ]);
        resolve();
      });

      child.on("close", (code, signal) => {
        if (record.settled) {
          resolve();
          return;
        }
        const output = chunks.join("");
        const parsed = parseLatexLog(output);
        const pdfBasename = `${path.basename(validated.mainFile, path.extname(validated.mainFile))}.pdf`;
        const pdfPath = path.join(record.outDir, pdfBasename);
        const pdfExists = fs.existsSync(pdfPath);
        if (pdfExists) {
          record.pdfPath = pdfPath;
          this.settle(record, "success", parsed);
        } else {
          const fallback: LogEntry[] = parsed.length
            ? parsed
            : [
                {
                  severity: "error",
                  message: `Compile exited with code ${code ?? "null"}${signal ? ` (signal ${signal})` : ""} and no PDF was produced.`,
                },
              ];
          this.settle(record, "error", fallback);
        }
        resolve();
      });
    });
  }

  cancelBuild(buildId: string, callerId: string): { status: 404 | 403; payload: { error: string } } | { status: 200; payload: { buildId: string; status: BuildStatus } } {
    const record = this.builds.get(buildId);
    if (!record) return { status: 404, payload: { error: `Unknown buildId: ${buildId}` } };
    if (record.callerId !== callerId) {
      return { status: 403, payload: { error: "This build does not belong to the requesting caller." } };
    }
    if (record.settled) {
      return { status: 200, payload: { buildId, status: record.status } };
    }
    if (record.pid) treeKill(record.pid, "SIGTERM", () => {});
    this.settle(record, "cancelled", [{ severity: "info", message: "Cancelled by request." }]);
    return { status: 200, payload: { buildId, status: "cancelled" } };
  }

  /** PDF/status reads are also ownership-scoped — see server.ts, which
   * checks this before serving `GET /status/:id` and the PDF route, closing
   * local-agent's "any caller who knows a buildId can read it" gap
   * (harmless on a single-user localhost tool, not on shared infrastructure). */
  isOwnedBy(buildId: string, callerId: string): boolean {
    return this.builds.get(buildId)?.callerId === callerId;
  }

  killAll(): void {
    for (const record of this.builds.values()) {
      if (!record.settled && record.pid) {
        treeKill(record.pid, "SIGTERM", () => {});
      }
    }
  }

  private settle(record: BuildRecord, status: BuildStatus, appendLog?: LogEntry[]): void {
    if (record.settled) return;
    record.settled = true;
    record.status = status;
    record.finishedAt = new Date().toISOString();
    record.durationMs = record.startedAt ? Date.now() - Date.parse(record.startedAt) : undefined;
    if (appendLog && appendLog.length) record.log.push(...appendLog);
    if (record.timeoutHandle) {
      clearTimeout(record.timeoutHandle);
      record.timeoutHandle = undefined;
    }

    const cleanup = () => fsp.rm(record.workDir, { recursive: true, force: true }).catch(() => {});
    if (status === "success") {
      setTimeout(cleanup, SUCCESS_CLEANUP_DELAY_MS).unref();
    } else {
      void cleanup();
    }
  }
}
