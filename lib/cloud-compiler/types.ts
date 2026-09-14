import type { Compiler } from "@/lib/types";

export type CloudBuildStatus = "queued" | "running" | "success" | "error" | "timeout" | "cancelled";

export interface CloudLogEntry {
  severity: "info" | "warning" | "error";
  message: string;
  file?: string;
  line?: number;
}

export interface CloudBuildStatusResponse {
  buildId: string;
  projectId: string;
  status: CloudBuildStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs?: number;
  pdfUrl?: string;
  log: CloudLogEntry[];
}

export interface CloudCompileFileInput {
  path: string;
  content: string;
  id?: string;
}

export interface CloudCompileRequest {
  projectId: string;
  mainFile: string;
  files: CloudCompileFileInput[];
  compiler: Compiler;
  draftMode?: boolean;
  shellEscape?: boolean;
}

export interface CloudSyncTexForward {
  page: number;
  x: number;
  y: number;
}

export interface CloudSyncTexInverse {
  file: string;
  line: number;
}
