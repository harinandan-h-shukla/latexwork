import { execFile } from "node:child_process";
import { CompilerInfo, CompilerName } from "./types";

const VERSION_FLAG: Record<CompilerName, string> = {
  pdflatex: "--version",
  xelatex: "--version",
  lualatex: "--version",
  latexmk: "-version",
  bibtex: "--version",
  biber: "--version",
};

const ALL_COMPILERS: CompilerName[] = [
  "pdflatex",
  "xelatex",
  "lualatex",
  "latexmk",
  "bibtex",
  "biber",
];

function run(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string } | null> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 10000 }, (err, stdout, stderr) => {
      if (err && (err as NodeJS.ErrnoException).code === "ENOENT") {
        resolve(null);
        return;
      }
      // Some tools (rare) exit non-zero on --version; still treat presence of
      // output as "found" as long as it's not a missing-binary error.
      if (err && !stdout && !stderr) {
        resolve(null);
        return;
      }
      resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
    });
  });
}

function resolvePath(cmd: string): Promise<string | undefined> {
  const finder = process.platform === "win32" ? "where" : "which";
  return new Promise((resolve) => {
    execFile(finder, [cmd], { timeout: 5000 }, (err, stdout) => {
      if (err || !stdout) {
        resolve(undefined);
        return;
      }
      const first = stdout.split(/\r?\n/).find((l) => l.trim().length > 0);
      resolve(first?.trim());
    });
  });
}

async function probeOne(name: CompilerName): Promise<CompilerInfo> {
  const flag = VERSION_FLAG[name];
  const result = await run(name, [flag]);
  if (!result) {
    return { name, available: false };
  }
  const combined = `${result.stdout}\n${result.stderr}`.trim();
  const firstLine = combined.split(/\r?\n/).find((l) => l.trim().length > 0)?.trim();
  const path = await resolvePath(name);
  return {
    name,
    available: true,
    version: firstLine,
    path,
  };
}

let cached: CompilerInfo[] | null = null;
let cachedAt = 0;

export async function discoverCompilers(forceRefresh = false): Promise<CompilerInfo[]> {
  if (cached && !forceRefresh) {
    return cached;
  }
  const results = await Promise.all(ALL_COMPILERS.map(probeOne));
  cached = results;
  cachedAt = Date.now();
  return results;
}

export function getCachedCompilers(): CompilerInfo[] | null {
  return cached;
}

export function getCacheAge(): number {
  return cached ? Date.now() - cachedAt : -1;
}
