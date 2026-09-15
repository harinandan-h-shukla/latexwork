import type { CompileLogEntry, CompileResult, Compiler } from "@/lib/types";
import type { LocalCompileFileInput } from "@/lib/local-compiler/types";
import type { SmartCompileParams } from "@/lib/local-compiler/compiler-service";
import { id } from "@/lib/mock-api";
import { parseLatexLog } from "./log-parser";
// texlyre-busytex itself is never imported at module scope — its runtime
// reaches for `Worker`, `document`, and `indexedDB`, none of which exist
// during a Next.js server render or the production build's module graph
// walk. Every reference below goes through the dynamic import() inside
// getRunner(), which only ever executes from a client-side user action
// (runCompile, called from the "use client" workspace-store /
// CompileToolbar).
type BusyTexModule = typeof import("texlyre-busytex");
type BusyTexRunnerInstance = InstanceType<BusyTexModule["BusyTexRunner"]>;

export const BROWSER_CAPABLE_COMPILERS = new Set<Compiler>(["pdflatex", "xelatex", "lualatex"]);

const BUSYTEX_BASE_PATH = "/core/busytex";

/** Where the actual runtime picks up assets from. Populated by
 * `npx texlyre-busytex download-assets ./public/core` — deliberately not
 * committed to git (see .gitignore) or bundled into the Next.js build:
 * the combined asset set is ~500MB as of texlyre-busytex 1.4.0 (verified
 * directly against the GitHub release, not the README's "90-400MB"
 * figure — see the commit message / final report for the full breakdown),
 * so it's provisioned as a deploy-time step, same shape as any other
 * static asset this app serves from public/.
 *
 * engineMode is deliberately left at the library's own default
 * ("combined" — one wasm covering pdftex+xetex+luahbtex) rather than the
 * per-engine "pdftex"/"xetex"/"luahbtex" split the type system also
 * offers. The busytex-build project's Makefile does have real per-engine
 * build targets, so the split isn't vaporware, but the only asset host
 * actually checked hands-on for this task (texlyre's own GitHub Pages
 * demo) only serves the combined busytex.wasm/.js — pdftex.wasm/xetex.wasm
 * both 404 there. Since it wasn't possible in this session to download
 * the full ~500MB release tarball to confirm whether the split files ship
 * in it too (see the final report), shipping the one mode that's actually
 * confirmed to exist and to be what the library falls back to when
 * unconfigured is the honest choice here — switching to per-engine mode
 * later means mapping Compiler -> EngineMode again and caching one runner
 * per engine (as an earlier draft of this file did) once someone actually
 * confirms the split assets are there. */
const ENGINE_MODE = "combined";

/**
 * Environment feature check only — no network probe needed (unlike
 * detectLocal(), which has to ask an external process whether it's
 * running). A browser new enough to run WebAssembly and Web Workers can
 * run texlyre-busytex; whether the *assets* actually load is discovered
 * the first time initialize() is awaited, and surfaces as a normal
 * compile error if they don't.
 */
export function isBrowserCompileSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof WebAssembly !== "undefined" &&
    typeof Worker !== "undefined"
  );
}

/** One BusyTexRunner, cached for the life of the tab — "combined" mode
 * means a single runner already covers pdflatex/xelatex/lualatex (the
 * `driver` passed to compile() picks the engine per call), so there's no
 * need to keep one instance per compiler the way a per-engine build
 * would've required. */
let runnerPromise: Promise<BusyTexRunnerInstance> | null = null;

/** Swapped in/out around each compile() call — see the comment on
 * BusyTexConfig.onDownloadProgress in browser-compiler-client: the runner
 * (and its progress callback) is created once and reused across many
 * compiles, but each compile has its own onUpdate() to report progress
 * to, so the callback can't be fixed at runner-construction time. */
let currentProgressHandler: ((loaded: number, total: number) => void) | null = null;

async function getRunner(): Promise<BusyTexRunnerInstance> {
  if (runnerPromise) return runnerPromise;

  runnerPromise = (async () => {
    const { BusyTexRunner } = await import("texlyre-busytex");
    const runner = new BusyTexRunner({
      busytexBasePath: BUSYTEX_BASE_PATH,
      engineMode: ENGINE_MODE,
      // Not optional, confirmed by hands-on testing (not just reading the
      // README): without a preloadDataPackages entry, kpathsea never gets
      // a base texmf tree or the format-file (pdflatex.fmt) it needs just
      // to START, and fails before running on ANY document — even one
      // with zero \usepackage lines — with a confusing
      // "lstat(/bin) failed" error that has nothing to do with the real
      // cause (texlive-basic.js is only the *catalog*; the actual ~93MB
      // texlive-basic.data payload it points at has to be fetched too).
      // "texlive-basic" (not "-recommended", which is ~3x bigger) is the
      // smallest collection that gets a plain article to compile.
      preloadDataPackages: [`${BUSYTEX_BASE_PATH}/texlive-basic.js`],
      // Real bug, real repro on the deployed site: a document using
      // \usepackage{microtype} (an extremely common package — pulled in by
      // many document classes, not just used explicitly) failed with
      // "File `microtype.sty' not found" even though texlive-basic's own
      // "unresolved package -> enable all available data packages"
      // fallback ran. That fallback can only search catalogs the runner
      // was actually told about — texlive-basic was the ONLY one preloaded
      // and no catalogDataPackages were ever declared, so microtype (which
      // lives in texlive-recommended, not -basic) was structurally
      // impossible to find, fallback or not. catalogDataPackages registers
      // a package tier as *available for on-demand loading* without
      // preloading its full .data payload up front (confirmed by the
      // README: "Data packages available for later loading") — the earlier
      // real end-to-end compile test already showed this kind of lazy
      // fetch only pulls in what's actually needed, not the whole tier, so
      // registering both remaining tiers here shouldn't meaningfully slow
      // down documents that don't need them.
      catalogDataPackages: [
        `${BUSYTEX_BASE_PATH}/texlive-recommended.js`,
        `${BUSYTEX_BASE_PATH}/texlive-extra.js`,
      ],
      onDownloadProgress: (progress) => currentProgressHandler?.(progress.loaded, progress.total),
    });
    await runner.initialize(true);
    return runner;
  })();

  // If initialize() rejects (assets missing/404, worker crash, etc.), don't
  // leave the failed promise cached — the next compile attempt should get
  // a fresh try rather than replaying the same rejection forever.
  runnerPromise.catch(() => {
    runnerPromise = null;
  });
  return runnerPromise;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toFileInput(f: LocalCompileFileInput): { path: string; content: string | Uint8Array } {
  return {
    path: f.path,
    content: f.encoding === "base64" ? base64ToUint8Array(f.content) : f.content,
  };
}

function mapLog(
  rawLog: string,
  files: LocalCompileFileInput[]
): CompileLogEntry[] {
  const idByPath = new Map(files.filter((f) => f.id).map((f) => [f.path, f.id as string]));
  return parseLatexLog(rawLog).map((entry) => ({
    id: id("log"),
    severity: entry.severity,
    message: entry.message,
    fileId: entry.file ? idByPath.get(entry.file) : undefined,
    line: entry.line,
  }));
}

/** Runs an in-browser compile via texlyre-busytex (AGPL-3.0 — see LICENSE
 * and Settings → Open source). Mirrors compileSmart()'s shape (params,
 * onUpdate, returns a CompileResult) so runCompile() in workspace-store
 * can call this or compileSmart() interchangeably based on
 * resolveCompileSource()'s pick — but this one runs entirely on the
 * client, no network round-trip to a compile service. */
export async function compileBrowser(
  params: SmartCompileParams,
  onUpdate: (partial: CompileResult) => void
): Promise<CompileResult> {
  const startedAt = new Date().toISOString();
  const base: Omit<CompileResult, "status" | "log" | "pdfUrl" | "finishedAt" | "durationMs"> = {
    id: id("compile"),
    projectId: params.projectId,
    compiler: params.compiler,
    draftMode: Boolean(params.draftMode),
    startedAt,
    queuePosition: null,
    etaSeconds: null,
    pageCount: null,
    synctex: [],
    source: "browser",
  };

  if (!BROWSER_CAPABLE_COMPILERS.has(params.compiler)) {
    return {
      ...base,
      status: "error",
      finishedAt: new Date().toISOString(),
      pdfUrl: null,
      log: [{ id: id("log"), severity: "error", message: `${params.compiler} has no in-browser engine.` }],
    };
  }

  onUpdate({
    ...base,
    status: "running",
    finishedAt: null,
    pdfUrl: null,
    log: [{ id: id("log"), severity: "info", message: "Starting in-browser compiler…" }],
  });

  try {
    currentProgressHandler = (loaded, total) => {
      if (total <= 0) return;
      const percent = Math.round((loaded / total) * 100);
      onUpdate({
        ...base,
        status: "running",
        finishedAt: null,
        pdfUrl: null,
        log: [{ id: id("log"), severity: "info", message: `Downloading compiler assets… ${percent}%` }],
      });
    };

    const runner = await getRunner();
    const busytex = await import("texlyre-busytex");
    const Tool = params.compiler === "pdflatex" ? busytex.PdfLatex : params.compiler === "xelatex" ? busytex.XeLatex : busytex.LuaLatex;
    const tool = new Tool(runner);

    const mainEntry = params.files.find((f) => f.path === params.mainFile);
    const otherFiles = params.files.filter((f) => f.path !== params.mainFile);
    const hasBib = params.files.some((f) => f.path.toLowerCase().endsWith(".bib"));

    const result = await tool.compile({
      // The main .tex file is always text (never base64-encoded — that
      // encoding only exists for binary figures gathered alongside it in
      // workspace-store's runCompile), so its content is used as-is.
      input: mainEntry?.content ?? "",
      mainTexPath: params.mainFile,
      additionalFiles: otherFiles.map(toFileInput),
      bibtex: hasBib,
      rerun: !params.draftMode,
      verbose: "silent",
      shellEscape: params.shellEscape,
    });

    currentProgressHandler = null;
    const finishedAt = new Date().toISOString();
    const log = mapLog(result.log, params.files);
    if (!result.success && log.every((l) => l.severity !== "error")) {
      log.push({ id: id("log"), severity: "error", message: `Compile failed (exit code ${result.exitCode}).` });
    }

    let pdfUrl: string | null = null;
    if (result.pdf && result.pdf.byteLength > 0) {
      const blob = new Blob([new Uint8Array(result.pdf)], { type: "application/pdf" });
      pdfUrl = URL.createObjectURL(blob);
    }

    return {
      ...base,
      status: result.success && pdfUrl ? "success" : "error",
      finishedAt,
      durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
      pdfUrl,
      log,
    };
  } catch (err) {
    currentProgressHandler = null;
    return {
      ...base,
      status: "error",
      finishedAt: new Date().toISOString(),
      pdfUrl: null,
      log: [
        {
          id: id("log"),
          severity: "error",
          message: `In-browser compile failed to start: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
    };
  }
}

/** BusyTexRunner has no per-compile abort — only terminate(), which tears
 * down the whole worker. Coarser than cancelling a local/cloud build (which
 * cancels just that one build), but it's the only stop control the library
 * exposes; the terminated engine is dropped from the cache so the next
 * compile gets a fresh worker rather than reusing a torn-down one. */
export async function cancelBrowserCompile(_compile: CompileResult): Promise<void> {
  if (!runnerPromise) return;
  const pending = runnerPromise;
  runnerPromise = null;
  try {
    const runner = await pending;
    runner.terminate();
  } catch {
    // Already failed to initialize — nothing to terminate.
  }
}
