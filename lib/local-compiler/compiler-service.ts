import type { CompileResult, Compiler, CompilerPreference } from "@/lib/types";
import { compileProject, id, stopCompile, type CompileOptions } from "@/lib/mock-api";
import {
  cancelLocalBuild,
  detectLocalAgent,
  getLocalBuildStatus,
  localPdfUrl,
  startLocalCompile,
  subscribeLocalBuildUpdates,
} from "@/lib/local-compiler/local-compiler-client";
import type {
  LocalAgentInfo,
  LocalBuildStatus,
  LocalBuildStatusResponse,
  LocalCompileFileInput,
} from "@/lib/local-compiler/types";

const LOCAL_CAPABLE_COMPILERS = new Set<Compiler>(["pdflatex", "xelatex", "lualatex"]);
const FINAL_LOCAL_STATUSES: LocalBuildStatus[] = ["success", "error", "timeout", "cancelled"];

let cachedAgentInfo: LocalAgentInfo | null = null;
let cachedAt = 0;
const DETECT_CACHE_MS = 4000;

export async function detectLocal(force = false): Promise<LocalAgentInfo | null> {
  const now = Date.now();
  if (!force && now - cachedAt < DETECT_CACHE_MS) return cachedAgentInfo;
  cachedAgentInfo = await detectLocalAgent();
  cachedAt = now;
  return cachedAgentInfo;
}

export function resolveCompileSource(
  preference: CompilerPreference | undefined,
  agentInfo: LocalAgentInfo | null,
  compiler: Compiler
): "local" | "cloud" {
  if (preference === "always-cloud") return "cloud";
  if (!LOCAL_CAPABLE_COMPILERS.has(compiler)) return "cloud";
  if (!agentInfo) return "cloud";
  const match = agentInfo.compilers.find((c) => c.name === compiler);
  if (!match?.available) return "cloud";
  return "local";
}

export interface SmartCompileParams {
  projectId: string;
  mainFile: string;
  files: LocalCompileFileInput[];
  compiler: Compiler;
  draftMode?: boolean;
  shellEscape?: boolean;
  incremental?: boolean;
  customCommand?: string;
  simulateTimeout?: boolean;
}

function mapLocalStatus(status: LocalBuildStatusResponse): CompileResult["status"] {
  if (status.status === "cancelled") return "stopped";
  return status.status;
}

function mapLocalLog(status: LocalBuildStatusResponse): CompileResult["log"] {
  return status.log.map((entry, i) => ({
    id: `${status.buildId}-log-${i}`,
    severity: entry.severity,
    message: entry.message,
    file: entry.file,
    line: entry.line,
  }));
}

function toCompileResult(
  status: LocalBuildStatusResponse,
  compiler: Compiler,
  draftMode: boolean
): CompileResult {
  return {
    id: status.buildId,
    projectId: status.projectId,
    status: mapLocalStatus(status),
    compiler,
    draftMode,
    startedAt: status.startedAt,
    finishedAt: status.finishedAt,
    queuePosition: status.status === "queued" ? 1 : null,
    etaSeconds: null,
    pdfUrl: status.pdfUrl ? localPdfUrl(status.pdfUrl) : null,
    pageCount: null,
    log: mapLocalLog(status),
    synctex: [],
    source: "local",
    durationMs: status.durationMs,
  };
}

async function runLocal(
  params: SmartCompileParams,
  onUpdate: (partial: CompileResult) => void
): Promise<CompileResult> {
  const request = {
    projectId: params.projectId,
    mainFile: params.mainFile,
    files: params.files,
    compiler: params.compiler as "pdflatex" | "xelatex" | "lualatex",
    options: {
      draftMode: params.draftMode,
      shellEscape: params.shellEscape,
      clean: false,
    },
  };

  const { buildId } = await startLocalCompile(request);

  return new Promise<CompileResult>((resolve, reject) => {
    let settled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const finish = (status: LocalBuildStatusResponse) => {
      if (settled) return;
      settled = true;
      unsubscribe();
      if (pollTimer) clearInterval(pollTimer);
      resolve(toCompileResult(status, params.compiler, Boolean(params.draftMode)));
    };

    const apply = (status: LocalBuildStatusResponse) => {
      if (settled) return;
      onUpdate(toCompileResult(status, params.compiler, Boolean(params.draftMode)));
      if (FINAL_LOCAL_STATUSES.includes(status.status)) finish(status);
    };

    const unsubscribe = subscribeLocalBuildUpdates(params.projectId, apply);

    pollTimer = setInterval(() => {
      getLocalBuildStatus(buildId).then(apply).catch(() => {});
    }, 1000);

    getLocalBuildStatus(buildId)
      .then(apply)
      .catch((err) => {
        if (!settled) {
          settled = true;
          unsubscribe();
          if (pollTimer) clearInterval(pollTimer);
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
  });
}

async function runCloud(
  params: SmartCompileParams,
  onUpdate: (partial: CompileResult) => void
): Promise<CompileResult> {
  const options: CompileOptions = {
    compiler: params.compiler,
    draftMode: params.draftMode,
    shellEscape: params.shellEscape,
    incremental: params.incremental,
    customCommand: params.customCommand,
    simulateTimeout: params.simulateTimeout,
  };
  const tag = (result: CompileResult): CompileResult => ({ ...result, source: "cloud" });
  const result = await compileProject(
    params.projectId,
    { mainFile: params.mainFile, files: params.files },
    options,
    (partial) => onUpdate(tag(partial))
  );
  return tag(result);
}

export async function compileSmart(
  params: SmartCompileParams,
  source: "local" | "cloud",
  onUpdate: (partial: CompileResult) => void
): Promise<CompileResult> {
  if (source === "local") {
    try {
      return await runLocal(params, onUpdate);
    } catch {
      const fallback: CompileResult = {
        id: id("compile"),
        projectId: params.projectId,
        status: "error",
        compiler: params.compiler,
        draftMode: Boolean(params.draftMode),
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        queuePosition: null,
        etaSeconds: null,
        pdfUrl: null,
        pageCount: null,
        log: [
          {
            id: id("log"),
            severity: "error",
            message: "Local compiler became unreachable — retrying with cloud compilation.",
          },
        ],
        synctex: [],
        source: "local",
      };
      onUpdate(fallback);
      return runCloud(params, onUpdate);
    }
  }
  return runCloud(params, onUpdate);
}

export async function cancelSmart(result: CompileResult): Promise<void> {
  if (result.source === "local") {
    await cancelLocalBuild(result.id);
  } else {
    await stopCompile(result.id);
  }
}
