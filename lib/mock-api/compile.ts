import type { CompileLogEntry, CompileResult, Compiler, SyncTexMapping } from "@/lib/types";
import { delay, id, mockDb } from "@/lib/mock-api/db";
import { renderMockPdf, type RenderableFile } from "@/lib/mock-api/mock-pdf-renderer";

let lastMockPdfUrl: string | null = null;

const cancelled = new Set<string>();

function now(): string {
  return new Date().toISOString();
}

export interface CompileOptions {
  compiler?: Compiler;
  draftMode?: boolean;
  /** Mock-only: echoed into the compile log, never actually executed. */
  customCommand?: string;
  /** Mock-only: echoed into the compile log. */
  shellEscape?: boolean;
  /** Skips the simulated queue delay and shortens the run delay. */
  incremental?: boolean;
  /** Forces this compile to resolve as `status: "timeout"` (demo/dev affordance). */
  simulateTimeout?: boolean;
}

/** The files actually open/known in the caller's workspace right now — passed in explicitly
 * rather than read from a shared store, since "the current files" can live in different places
 * (the Zustand editor store for a live compile, MongoDB for an export) depending on caller. */
export interface CompileSource {
  /** Path of the main file, no leading slash (e.g. "main.tex"). */
  mainFile: string;
  files: { path: string; content: string; id?: string }[];
}

const TIMEOUT_SECONDS = 25;

function toRenderableFiles(source: CompileSource): RenderableFile[] {
  const mainPath = source.mainFile.replace(/^\//, "");
  return source.files.map((f) => {
    const cleanPath = f.path.replace(/^\//, "");
    return {
      id: f.id ?? cleanPath,
      path: `/${cleanPath}`,
      name: cleanPath.split("/").pop() ?? cleanPath,
      content: f.content,
      isMain: cleanPath === mainPath,
    };
  });
}

function randomLocation(files: RenderableFile[]): { fileId: string; line: number } | null {
  const candidates = files.filter((f) => f.name.endsWith(".tex") && f.content.length > 0);
  if (candidates.length === 0) return null;
  const file = candidates[Math.floor(Math.random() * candidates.length)];
  const lineCount = file.content.split("\n").length;
  const line = Math.min(lineCount, Math.max(1, Math.floor(Math.random() * lineCount) + 1));
  return { fileId: file.id, line };
}

function buildLog(files: RenderableFile[], options?: CompileOptions): CompileLogEntry[] {
  const mainFile = files.find((f) => f.isMain);
  const log: CompileLogEntry[] = [
    { id: id("log"), severity: "info", message: "This is pdfTeX, Version 3.141592653-2.6-1.40.25 (TeX Live 2024)" },
    { id: id("log"), severity: "info", message: `Loading ${files.length} source file(s)` },
  ];
  if (mainFile) {
    log.push({ id: id("log"), severity: "info", message: `LaTeX2e <${mainFile.name}> Document class detected` });
  }
  if (options?.customCommand) {
    log.push({
      id: id("log"),
      severity: "info",
      message: `Using custom compile command: ${options.customCommand}`,
    });
  }
  log.push({
    id: id("log"),
    severity: "info",
    message: options?.shellEscape ? "Shell escape enabled (--shell-escape)" : "Shell escape disabled",
  });
  if (options?.incremental) {
    log.push({ id: id("log"), severity: "info", message: "Incremental compile: reusing cached auxiliary files" });
  }

  const warnLocation = randomLocation(files);
  const warnEntry: CompileLogEntry = {
    id: id("log"),
    severity: "warning",
    message: "Underfull \\hbox (badness 10000) in paragraph",
  };
  if (warnLocation) Object.assign(warnEntry, warnLocation);
  log.push(warnEntry);

  if (Math.random() < 0.4) {
    const overfullLocation = randomLocation(files);
    const overfullEntry: CompileLogEntry = {
      id: id("log"),
      severity: "warning",
      message: "Overfull \\hbox (12.3pt too wide) detected",
    };
    if (overfullLocation) Object.assign(overfullEntry, overfullLocation);
    log.push(overfullEntry);
  }

  log.push({ id: id("log"), severity: "info", message: "Output written on main.pdf" });
  return log;
}

function buildTimeoutLog(files: RenderableFile[]): CompileLogEntry[] {
  const mainFile = files.find((f) => f.isMain);
  const log: CompileLogEntry[] = [
    { id: id("log"), severity: "info", message: "This is pdfTeX, Version 3.141592653-2.6-1.40.25 (TeX Live 2024)" },
  ];
  if (mainFile) {
    log.push({ id: id("log"), severity: "info", message: `LaTeX2e <${mainFile.name}> Document class detected` });
  }
  log.push({
    id: id("log"),
    severity: "error",
    message: `Compilation exceeded the ${TIMEOUT_SECONDS}s timeout limit and was aborted.`,
  });
  return log;
}

function buildSynctex(files: RenderableFile[], pageCount: number): SyncTexMapping[] {
  const mainFile = files.find((f) => f.isMain) ?? files.find((f) => f.name.endsWith(".tex"));
  if (!mainFile?.content) return [];
  const lineCount = mainFile.content.split("\n").length;
  if (lineCount < 1) return [];

  const count = Math.min(6, Math.max(2, lineCount));
  const mappings: SyncTexMapping[] = [];
  for (let i = 0; i < count; i++) {
    const fraction = (i + 1) / (count + 1);
    const line = Math.max(1, Math.min(lineCount, Math.round(fraction * lineCount)));
    mappings.push({
      fileId: mainFile.id,
      line,
      // `page` and `x`/`y` are mocked as fractions of the page (0..1), not real PDF points.
      page: pageCount > 1 && i >= Math.ceil(count / 2) ? 2 : 1,
      x: 0.5,
      y: fraction,
    });
  }
  return mappings;
}

export async function getLatestCompile(projectId: string): Promise<CompileResult | null> {
  await delay(100);
  const results = mockDb.compiles.filter((c) => c.projectId === projectId);
  return results.length > 0 ? results[results.length - 1] : null;
}

export async function compileProject(
  projectId: string,
  source: CompileSource,
  options?: CompileOptions,
  onUpdate?: (partial: CompileResult) => void
): Promise<CompileResult> {
  const result: CompileResult = {
    id: id("compile"),
    projectId,
    status: "queued",
    compiler: options?.compiler ?? "pdflatex",
    draftMode: options?.draftMode ?? false,
    startedAt: null,
    finishedAt: null,
    queuePosition: options?.incremental ? null : 2,
    etaSeconds: options?.incremental ? 1 : 6,
    pdfUrl: null,
    pageCount: null,
    log: [],
    synctex: [],
  };
  mockDb.compiles.push(result);
  onUpdate?.({ ...result });

  if (!options?.incremental) {
    // Halved from 700ms — the queued→running→done stepper should still read
    // clearly, but this mock timer was adding perceptible lag on its own for
    // every single compile, mock or not.
    await delay(300);
    if (cancelled.has(result.id)) {
      result.status = "stopped";
      onUpdate?.({ ...result });
      return result;
    }
  }

  result.status = "running";
  result.startedAt = now();
  result.queuePosition = null;
  result.etaSeconds = options?.draftMode || options?.incremental ? 1 : 3;
  onUpdate?.({ ...result });

  const willTimeout = options?.simulateTimeout ?? false;
  const runDelay = options?.incremental ? 200 : options?.draftMode ? 350 : 800;

  await delay(runDelay);
  if (cancelled.has(result.id)) {
    result.status = "stopped";
    result.finishedAt = now();
    onUpdate?.({ ...result });
    return result;
  }

  const files = toRenderableFiles(source);

  if (willTimeout) {
    result.status = "timeout";
    result.finishedAt = now();
    result.log = buildTimeoutLog(files);
    onUpdate?.({ ...result });
    return result;
  }

  result.status = "success";
  result.finishedAt = now();
  const rendered = await renderMockPdf(files);
  if (lastMockPdfUrl) URL.revokeObjectURL(lastMockPdfUrl);
  lastMockPdfUrl = rendered.url;
  result.pdfUrl = rendered.url;
  result.pageCount = rendered.pageCount;
  result.log = buildLog(files, options);
  result.synctex = buildSynctex(files, result.pageCount);
  onUpdate?.({ ...result });
  return result;
}

export async function stopCompile(compileId: string): Promise<void> {
  cancelled.add(compileId);
  await delay(100);
}
