export type CompilerName = "pdflatex" | "xelatex" | "lualatex" | "latexmk" | "bibtex" | "biber";

export interface CompilerInfo {
  name: CompilerName;
  available: boolean;
  version?: string;
  path?: string;
}

export interface VersionResponse {
  agentVersion: string;
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
export type BibEngine = "bibtex" | "biber" | "auto";

export interface CompileOptions {
  draftMode?: boolean;
  shellEscape?: boolean;
  timeoutMs?: number;
  clean?: boolean;
}

export interface CompileRequestBody {
  projectId: string;
  mainFile: string;
  files: InputFile[];
  compiler: EngineName;
  bibEngine?: BibEngine;
  options?: CompileOptions;
}

export type BuildStatus =
  | "queued"
  | "running"
  | "success"
  | "error"
  | "timeout"
  | "cancelled";

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
  status: BuildStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs?: number;
  log: LogEntry[];
  pdfPath?: string;
  // internal-only fields, not sent verbatim to clients
  pid?: number;
  timeoutHandle?: NodeJS.Timeout;
  settled?: boolean;
  mainFile: string;
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

export interface BuildUpdateEvent {
  type: "build-update";
  buildId: string;
  projectId: string;
  status: BuildStatus;
  log: LogEntry[];
  pdfUrl?: string;
  durationMs?: number;
}
