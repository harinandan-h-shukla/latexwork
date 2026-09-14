export type LocalCompilerName = "pdflatex" | "xelatex" | "lualatex" | "latexmk" | "bibtex" | "biber";

export interface LocalCompilerInfo {
  name: LocalCompilerName;
  available: boolean;
  version?: string;
  path?: string;
}

export interface LocalAgentInfo {
  agentVersion: string;
  platform: string;
  compilers: LocalCompilerInfo[];
}

export type LocalBuildStatus = "queued" | "running" | "success" | "error" | "timeout" | "cancelled";

export interface LocalLogEntry {
  severity: "info" | "warning" | "error";
  message: string;
  file?: string;
  line?: number;
}

export interface LocalBuildStatusResponse {
  buildId: string;
  projectId: string;
  status: LocalBuildStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs?: number;
  pdfUrl?: string;
  log: LocalLogEntry[];
}

export interface LocalCompileFileInput {
  path: string;
  content: string;
  encoding?: "utf8" | "base64";
  /** Mock-cloud-only (ignored by the real local agent's API): the file's real id, for synctex/log line attribution. */
  id?: string;
}

export interface LocalCompileRequest {
  projectId: string;
  mainFile: string;
  files: LocalCompileFileInput[];
  compiler: "pdflatex" | "xelatex" | "lualatex";
  bibEngine?: "bibtex" | "biber" | "auto";
  options?: {
    draftMode?: boolean;
    shellEscape?: boolean;
    timeoutMs?: number;
    clean?: boolean;
  };
}

export interface LocalSyncTexForward {
  page: number;
  /** Points (72dpi), top-left origin — synctex's own coordinate convention. */
  x: number;
  y: number;
}

export interface LocalSyncTexInverse {
  file: string;
  line: number;
}
