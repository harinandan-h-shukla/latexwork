import type { CompileResult, CompileLogEntry, Compiler, CompilerPreference } from "@/lib/types";
import { compileProject, id, stopCompile, type CompileOptions } from "@/lib/mock-api";
import {
  cancelLocalBuild,
  detectLocalAgent,
  getLocalBuildStatus,
  localPdfUrl,
  localSyncTexForward,
  localSyncTexInverse,
  startLocalCompile,
  subscribeLocalBuildUpdates,
} from "@/lib/local-compiler/local-compiler-client";
import type {
  LocalAgentInfo,
  LocalBuildStatus,
  LocalBuildStatusResponse,
  LocalCompileFileInput,
} from "@/lib/local-compiler/types";
import {
  cancelCloudCompile,
  getCloudCompileStatus,
  getCloudSyncTexForward,
  getCloudSyncTexInverse,
  startCloudCompile,
} from "@/lib/cloud-compiler/actions";
import type { CloudBuildStatus, CloudBuildStatusResponse } from "@/lib/cloud-compiler/types";

const LOCAL_CAPABLE_COMPILERS = new Set<Compiler>(["pdflatex", "xelatex", "lualatex"]);
// Kept in sync with lib/browser-compiler/browser-compiler-client.ts's own
// BROWSER_CAPABLE_COMPILERS (not imported from there — that module pulls in
// texlyre-busytex's types and is meant to load only on the client; this
// file is imported by workspace-store at module scope and should stay free
// of anything that assumes a browser environment).
const BROWSER_CAPABLE_COMPILERS = new Set<Compiler>(["pdflatex", "xelatex", "lualatex"]);
const FINAL_LOCAL_STATUSES: LocalBuildStatus[] = ["success", "error", "timeout", "cancelled"];
const FINAL_CLOUD_STATUSES: CloudBuildStatus[] = ["success", "error", "timeout", "cancelled"];
// A real (Mongo ObjectId) project — the only kind the real cloud-compiler
// service has files for. A legacy mock project id still uses the fake
// client-side renderer, since there's no real file storage behind it to
// compile in the first place.
const REAL_PROJECT_ID_RE = /^[0-9a-f]{24}$/i;

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
  compiler: Compiler,
  // Only consulted for "ask-each-time" — the per-project-open pick made via
  // CompilerChoiceDialog, held in workspace-store (not persisted to the
  // account, unlike the other two preferences). Before this existed,
  // "ask-each-time" was accepted by the schema/type but never actually
  // asked anything — it silently behaved exactly like "prefer-local".
  sessionChoice?: "local" | "cloud" | "browser" | null,
  // Static environment feature check (WebAssembly + Worker support) — see
  // isBrowserCompileSupported() in lib/browser-compiler/browser-compiler-client.
  // Passed in rather than detected here so this function stays a pure,
  // synchronous, easily-testable decision — same reasoning as agentInfo
  // being passed in already-resolved instead of this function calling
  // detectLocal() itself.
  browserSupported = false
): "local" | "cloud" | "browser" {
  // An explicit "always use the cloud" is respected as-is, not silently
  // rerouted to the browser engine — someone who picked this may
  // specifically want to avoid spending their own CPU/battery/bandwidth on
  // a ~500MB-class in-browser compiler, which is a real cost "the cloud"
  // is meant to avoid, even though today's cloud path falls back to the
  // mock renderer when the real cloud-compiler service isn't deployed
  // (see runCloud in this file).
  if (preference === "always-cloud") return "cloud";
  if (preference === "ask-each-time") {
    if (sessionChoice === "cloud") return "cloud";
    if (sessionChoice === "browser" && browserSupported) return "browser";
    // sessionChoice === "local" (or "browser" without support) falls
    // through to the normal local-agent-availability check below, same as
    // before this function knew about "browser" at all.
  }
  if (LOCAL_CAPABLE_COMPILERS.has(compiler) && agentInfo) {
    const match = agentInfo.compilers.find((c) => c.name === compiler);
    if (match?.available) return "local";
  }
  // local-agent requires a whole separate install this session's owner has
  // hit real friction with — the in-browser WASM engine needs nothing
  // installed, so it's the preferred fallback ahead of "cloud" (which,
  // unlike browser, isn't actually deployed anywhere real yet).
  if (BROWSER_CAPABLE_COMPILERS.has(compiler) && browserSupported) return "browser";
  return "cloud";
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

function toCompileResultFromCloud(
  status: CloudBuildStatusResponse,
  compiler: Compiler,
  draftMode: boolean
): CompileResult {
  const log: CompileLogEntry[] = status.log.map((entry, i) => ({
    id: `${status.buildId}-log-${i}`,
    severity: entry.severity,
    message: entry.message,
    fileId: entry.file,
    line: entry.line,
  }));
  return {
    id: status.buildId,
    projectId: status.projectId,
    status: status.status === "cancelled" ? "stopped" : status.status,
    compiler,
    draftMode,
    startedAt: status.startedAt,
    finishedAt: status.finishedAt,
    queuePosition: status.status === "queued" ? 1 : null,
    etaSeconds: null,
    pdfUrl: status.pdfUrl ? `/api/cloud-compile/${status.buildId}/pdf` : null,
    pageCount: null,
    log,
    synctex: [],
    source: "cloud",
    durationMs: status.durationMs,
  };
}

/** Real cloud compile for a real (Mongo) project: kick off the build via the
 * cloud-compiler/ service (proxied through lib/cloud-compiler/actions.ts so
 * the shared secret never reaches the browser) and poll status the same way
 * runLocal() polls the local agent — no WebSocket push for cloud, interval
 * polling only (see the "explicitly out of scope" note in the plan). */
async function runRealCloud(
  params: SmartCompileParams,
  onUpdate: (partial: CompileResult) => void
): Promise<CompileResult> {
  const { buildId } = await startCloudCompile({
    projectId: params.projectId,
    mainFile: params.mainFile,
    files: params.files,
    compiler: params.compiler,
    draftMode: params.draftMode,
    shellEscape: params.shellEscape,
  });

  return new Promise<CompileResult>((resolve, reject) => {
    let settled = false;
    const finish = (status: CloudBuildStatusResponse) => {
      if (settled) return;
      settled = true;
      clearInterval(pollTimer);
      resolve(toCompileResultFromCloud(status, params.compiler, Boolean(params.draftMode)));
    };
    const pollTimer: ReturnType<typeof setInterval> = setInterval(() => {
      getCloudCompileStatus(buildId)
        .then((status) => {
          if (settled) return;
          onUpdate(toCompileResultFromCloud(status, params.compiler, Boolean(params.draftMode)));
          if (FINAL_CLOUD_STATUSES.includes(status.status)) finish(status);
        })
        .catch((err) => {
          if (settled) return;
          settled = true;
          clearInterval(pollTimer);
          reject(err instanceof Error ? err : new Error(String(err)));
        });
    }, 1000);
  });
}

/** Legacy mock projects have no real file storage for a real service to
 * compile, so they keep the existing client-side fake renderer unchanged. */
async function runMockCloud(
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

async function runCloud(
  params: SmartCompileParams,
  onUpdate: (partial: CompileResult) => void
): Promise<CompileResult> {
  if (REAL_PROJECT_ID_RE.test(params.projectId)) {
    try {
      return await runRealCloud(params, onUpdate);
    } catch (err) {
      // The real cloud-compiler service isn't deployed/configured yet in
      // every environment (CLOUD_COMPILER_URL/CLOUD_COMPILER_SHARED_SECRET),
      // and even once it is, it can be unreachable. Falling back to the
      // approximate mock renderer — same resilience pattern as the
      // local→cloud fallback below — beats leaving the user with a
      // permanently-stuck "compiling" state and no error, which is what an
      // uncaught rejection here did before this fix.
      const result = await runMockCloud(params, onUpdate);
      return {
        ...result,
        log: [
          {
            id: id("log"),
            severity: "warning",
            message: `Real cloud compilation unavailable (${err instanceof Error ? err.message : String(err)}) — showing an approximate preview instead, not a real compile.`,
          },
          ...result.log,
        ],
      };
    }
  }
  return runMockCloud(params, onUpdate);
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
  } else if (REAL_PROJECT_ID_RE.test(result.projectId)) {
    await cancelCloudCompile(result.id);
  } else {
    await stopCompile(result.id);
  }
}

/** Real SyncTeX only exists for a real local or real cloud compile — the
 * mock renderer's `compile.synctex` array (a fabricated approximation) is
 * the caller's fallback when this returns null, not something this
 * function itself produces. */
export async function synctexForward(
  compile: CompileResult,
  mainFile: string,
  sourcePath: string,
  line: number
): Promise<{ page: number; x: number; y: number } | null> {
  if (compile.source === "local") {
    return localSyncTexForward(compile.projectId, mainFile, sourcePath, line);
  }
  if (compile.source === "cloud" && REAL_PROJECT_ID_RE.test(compile.projectId)) {
    return getCloudSyncTexForward(compile.id, sourcePath, line);
  }
  return null;
}

export async function synctexInverse(
  compile: CompileResult,
  mainFile: string,
  page: number,
  x: number,
  y: number
): Promise<{ file: string; line: number } | null> {
  if (compile.source === "local") {
    return localSyncTexInverse(compile.projectId, mainFile, page, x, y);
  }
  if (compile.source === "cloud" && REAL_PROJECT_ID_RE.test(compile.projectId)) {
    return getCloudSyncTexInverse(compile.id, page, x, y);
  }
  return null;
}
