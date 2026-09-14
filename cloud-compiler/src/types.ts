export type CompilerName = "pdflatex" | "xelatex" | "lualatex" | "latexmk" | "bibtex" | "biber";

export interface CompilerInfo {
  name: CompilerName;
  available: boolean;
  version?: string;
  path?: string;
}

export interface VersionResponse {
  serviceVersion: string;
  platform: string;
  compilers: CompilerInfo[];
}

export type FileEncoding = "utf8" | "base64";

export interface InputFile {
  path: string;
  content: string;
  encoding?: FileEncoding;
}

export type EngineName = "pdflatex" | "xelatex" | "lualatex";

export interface CompileOptions {
  draftMode?: boolean;
  shellEscape?: boolean;
  timeoutMs?: number;
}

export interface CompileRequestBody {
  projectId: string;
  /** The real, authenticated Inkwell user id — supplied by the Next.js server
   * (the only intended caller), never taken from an end user directly. Used
   * for the per-user rate limit and for correlating builds in logs; not
   * trusted for anything security-critical beyond that, since this service
   * has no way to verify it itself — the shared-secret bearer token is what
   * actually gates who may call this API at all. */
  callerId: string;
  mainFile: string;
  files: InputFile[];
  compiler: EngineName;
  options?: CompileOptions;
}

export type BuildStatus = "queued" | "running" | "success" | "error" | "timeout" | "cancelled";

export type LogSeverity = "info" | "warning" | "error";

export interface LogEntry {
  severity: LogSeverity;
  message: string;
  file?: string;
  line?: number;
}

export interface BuildRecord {
  buildId: string;
  projectId: string;
  callerId: string;
  status: BuildStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs?: number;
  log: LogEntry[];
  pdfPath?: string;
  // internal-only fields, never sent to clients
  pid?: number;
  timeoutHandle?: NodeJS.Timeout;
  settled?: boolean;
  mainFile: string;
  /** Per-build, not per-project — always a fresh directory, always deleted
   * once the build settles. Unlike local-agent, which deliberately reuses
   * one persistent directory per project for latexmk's incremental cache
   * (safe on a single trusted user's own machine, not safe here where the
   * directory would otherwise accumulate one tenant's files indefinitely on
   * shared infrastructure). */
  workDir: string;
  outDir: string;
}

export interface StatusResponse {
  buildId: string;
  projectId: string;
  status: BuildStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs?: number;
  pdfUrl?: string;
  log: LogEntry[];
}
