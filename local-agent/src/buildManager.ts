import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import treeKill from "tree-kill";

import { AgentConfig } from "./config";
import { isSafeProjectId, isSafeRelativePath, resolveInside } from "./paths";
import { parseLatexLog } from "./logParser";
import {
  BuildRecord,
  BuildStatus,
  BuildUpdateEvent,
  CompileOptions,
  CompilerInfo,
  EngineName,
  InputFile,
  LogEntry,
  StatusResponse,
} from "./types";

type ValidationError = { status: 400 | 413; error: string };

interface ValidatedCompile {
  projectId: string;
  mainFile: string;
  files: InputFile[];
  compiler: EngineName;
  options: Required<Pick<CompileOptions, "draftMode" | "shellEscape" | "clean">> & { timeoutMs: number };
}

const ENGINE_FLAG: Record<EngineName, string> = {
  pdflatex: "-pdf",
  xelatex: "-xelatex",
  lualatex: "-lualatex",
};

export type BroadcastFn = (projectId: string, event: BuildUpdateEvent) => void;

export class BuildManager {
  private builds = new Map<string, BuildRecord>();
  private activeByProject = new Map<string, string>();
  private counter = 0;

  constructor(
    private config: AgentConfig,
    private getCompilers: () => CompilerInfo[],
    private broadcast: BroadcastFn
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
      pdfUrl:
        record.status === "success" && record.pdfPath
          ? `/builds/${record.buildId}/output.pdf`
          : undefined,
      log: record.log,
    };
  }

  private nextBuildId(): string {
    this.counter += 1;
    return `build-${this.counter}`;
  }

  private validate(body: any): ValidationError | ValidatedCompile {
    if (!body || typeof body !== "object") {
      return { status: 400, error: "Request body must be a JSON object." };
    }
    const { projectId, mainFile, files, compiler, bibEngine, options } = body;

    if (!isSafeProjectId(projectId)) {
      return { status: 400, error: "projectId is required and must match /^[a-zA-Z0-9_-]+$/." };
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
      return { status: 400, error: `Compiler "${compiler}" is not installed/available on this agent.` };
    }
    const latexmkInfo = compilers.find((c) => c.name === "latexmk");
    if (!latexmkInfo || !latexmkInfo.available) {
      return { status: 400, error: "latexmk is required to run compiles but is not available on this agent." };
    }

    if (bibEngine !== undefined && !["bibtex", "biber", "auto"].includes(bibEngine)) {
      return { status: 400, error: 'bibEngine must be one of "bibtex", "biber", "auto" if provided.' };
    }

    const rawOptions = options && typeof options === "object" ? options : {};
    const requestedTimeout =
      typeof rawOptions.timeoutMs === "number" && Number.isFinite(rawOptions.timeoutMs) && rawOptions.timeoutMs > 0
        ? rawOptions.timeoutMs
        : this.config.defaultTimeoutMs;
    const timeoutMs = Math.min(requestedTimeout, this.config.maxTimeoutMs);

    return {
      projectId,
      mainFile,
      files,
      compiler,
      options: {
        draftMode: !!rawOptions.draftMode,
        shellEscape: !!rawOptions.shellEscape,
        clean: !!rawOptions.clean,
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

    // Single active build per project: supersede any existing queued/running build.
    const existingId = this.activeByProject.get(validated.projectId);
    if (existingId) {
      const existing = this.builds.get(existingId);
      if (existing) this.cancelInternal(existing, "Superseded by a newer compile request for this project.");
    }

    const buildId = this.nextBuildId();
    const projectDir = path.join(this.config.workDir, validated.projectId);
    const outDir = path.join(projectDir, ".build");

    const record: BuildRecord = {
      buildId,
      projectId: validated.projectId,
      status: "queued",
      startedAt: null,
      finishedAt: null,
      log: [],
      mainFile: validated.mainFile,
      workDir: projectDir,
      outDir,
      settled: false,
    };
    this.builds.set(buildId, record);
    this.activeByProject.set(validated.projectId, buildId);
    this.emit(record);

    // Fire-and-forget: the actual compile happens asynchronously.
    this.runBuild(record, validated).catch((err) => {
      this.settle(record, "error", [
        { severity: "error", message: `Internal agent error: ${err?.message ?? String(err)}` },
      ]);
    });

    return { status: 202, payload: { buildId, status: "queued" } };
  }

  private async runBuild(record: BuildRecord, validated: ValidatedCompile): Promise<void> {
    if (record.settled) return; // cancelled before it even started

    if (validated.options.clean) {
      await fsp.rm(record.workDir, { recursive: true, force: true });
    }
    await fsp.mkdir(record.workDir, { recursive: true });

    for (const f of validated.files) {
      const dest = resolveInside(record.workDir, f.path);
      if (!dest) {
        this.settle(record, "error", [
          { severity: "error", message: `Refusing to write outside project directory: ${f.path}` },
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

    const args = [
      ENGINE_FLAG[validated.compiler],
      "-interaction=nonstopmode",
      "-file-line-error",
      "-halt-on-error",
      `-outdir=${record.outDir}`,
    ];
    if (validated.options.shellEscape) args.push("-shell-escape");
    args.push(validated.mainFile);

    record.status = "running";
    record.startedAt = new Date().toISOString();
    this.emit(record);

    const child = spawn(latexmkPath, args, { cwd: record.workDir });
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
    }, validated.options.timeoutMs);

    child.on("error", (err) => {
      if (record.settled) return;
      this.settle(record, "error", [{ severity: "error", message: `Failed to start latexmk: ${err.message}` }]);
    });

    child.on("close", (code, signal) => {
      if (record.settled) return; // already cancelled/timed out
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
                message: `latexmk exited with code ${code ?? "null"}${signal ? ` (signal ${signal})` : ""} and no PDF was produced.`,
              },
            ];
        this.settle(record, "error", fallback);
      }
    });
  }

  private cancelInternal(record: BuildRecord, reasonMessage: string): void {
    if (record.settled) return;
    if (record.pid) {
      treeKill(record.pid, "SIGTERM", () => {});
    }
    this.settle(record, "cancelled", [{ severity: "info", message: reasonMessage }]);
  }

  cancelBuild(buildId: string): { status: 404; payload: { error: string } } | { status: 200; payload: { buildId: string; status: BuildStatus } } {
    const record = this.builds.get(buildId);
    if (!record) return { status: 404, payload: { error: `Unknown buildId: ${buildId}` } };
    if (record.settled) {
      return { status: 200, payload: { buildId, status: record.status } };
    }
    this.cancelInternal(record, "Cancelled by request.");
    return { status: 200, payload: { buildId, status: "cancelled" } };
  }

  cancelProject(projectId: string): { status: 200; payload: {} } {
    const buildId = this.activeByProject.get(projectId);
    if (buildId) {
      const record = this.builds.get(buildId);
      if (record && !record.settled) {
        this.cancelInternal(record, "Project closed in the editor.");
      }
    }
    return { status: 200, payload: {} };
  }

  /** Kill every still-running build's process tree. Used on agent shutdown. */
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
    if (this.activeByProject.get(record.projectId) === record.buildId) {
      this.activeByProject.delete(record.projectId);
    }
    this.emit(record);
  }

  private emit(record: BuildRecord): void {
    const event: BuildUpdateEvent = {
      type: "build-update",
      buildId: record.buildId,
      projectId: record.projectId,
      status: record.status,
      log: record.log,
      pdfUrl:
        record.status === "success" && record.pdfPath
          ? `/builds/${record.buildId}/output.pdf`
          : undefined,
      durationMs: record.durationMs,
    };
    this.broadcast(record.projectId, event);
  }
}
