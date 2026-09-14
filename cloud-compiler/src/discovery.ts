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

const ALL_COMPILERS: CompilerName[] = ["pdflatex", "xelatex", "lualatex", "latexmk", "bibtex", "biber"];

function run(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string } | null> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 10000 }, (err, stdout, stderr) => {
      if (err && (err as NodeJS.ErrnoException).code === "ENOENT") {
        resolve(null);
        return;
      }
      if (err && !stdout && !stderr) {
        resolve(null);
        return;
      }
      resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
    });
  });
}

function resolvePath(cmd: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    execFile("which", [cmd], { timeout: 5000 }, (err, stdout) => {
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
  return { name, available: true, version: firstLine, path };
}

let cached: CompilerInfo[] | null = null;

/**
 * This service runs in a single known Docker image (unlike local-agent,
 * which probes whatever a user happened to install) — the compiler set is
 * effectively fixed at image-build time. Still probed at startup rather
 * than hardcoded, so a `GET /health`-style check reflects the image's
 * actual contents instead of an assumption about it.
 */
export async function discoverCompilers(forceRefresh = false): Promise<CompilerInfo[]> {
  if (cached && !forceRefresh) return cached;
  cached = await Promise.all(ALL_COMPILERS.map(probeOne));
  return cached;
}

export function getCachedCompilers(): CompilerInfo[] | null {
  return cached;
}
