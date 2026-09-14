import os from "node:os";
import path from "node:path";

export interface ServiceConfig {
  port: number;
  workDir: string;
  sharedSecret: string;
  maxProjectSizeMb: number;
  maxFiles: number;
  defaultTimeoutMs: number;
  maxTimeoutMs: number;
  /** Bounded worker pool — the multi-tenant analogue of local-agent's
   * "one active build per project" rule, which only serializes within a
   * single project and leaves cross-tenant concurrency completely
   * unbounded. Real containers/VMs have finite CPU/memory, so this caps how
   * many `latexmk` processes run at once across ALL callers. */
  maxConcurrentBuilds: number;
  /** Per-caller sliding-window compile rate limit. */
  rateLimitMax: number;
  rateLimitWindowMs: number;
  /** Hard ceiling on a single build's memory (RLIMIT_AS, via `prlimit`) and
   * CPU seconds — the resource bounds local-agent has none of. */
  buildMemoryBytes: number;
  buildCpuSeconds: number;
}

const DEFAULT_PORT = 8080;
const DEFAULT_MAX_PROJECT_SIZE_MB = 50;
const MAX_FILES = 500;
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_TIMEOUT_MS = 180_000;
const DEFAULT_MAX_CONCURRENT_BUILDS = 4;
const DEFAULT_RATE_LIMIT_MAX = 20;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 5 * 60_000;
const DEFAULT_BUILD_MEMORY_BYTES = 768 * 1024 * 1024;
const DEFAULT_BUILD_CPU_SECONDS = 90;

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(): ServiceConfig {
  const sharedSecret = process.env.CLOUD_COMPILER_SHARED_SECRET;
  if (!sharedSecret) {
    throw new Error(
      "CLOUD_COMPILER_SHARED_SECRET is not set. This service authenticates its only intended " +
        "caller (the Next.js server) with a shared bearer token — refusing to start without one " +
        "rather than accepting unauthenticated compile requests."
    );
  }

  return {
    port: envNumber("PORT", DEFAULT_PORT),
    workDir: process.env.CLOUD_COMPILER_WORKDIR
      ? path.resolve(process.env.CLOUD_COMPILER_WORKDIR)
      : path.join(os.tmpdir(), "inkwell-cloud-compiler-work"),
    sharedSecret,
    maxProjectSizeMb: envNumber("CLOUD_COMPILER_MAX_PROJECT_SIZE_MB", DEFAULT_MAX_PROJECT_SIZE_MB),
    maxFiles: MAX_FILES,
    defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
    maxTimeoutMs: MAX_TIMEOUT_MS,
    maxConcurrentBuilds: envNumber("CLOUD_COMPILER_MAX_CONCURRENT_BUILDS", DEFAULT_MAX_CONCURRENT_BUILDS),
    rateLimitMax: envNumber("CLOUD_COMPILER_RATE_LIMIT_MAX", DEFAULT_RATE_LIMIT_MAX),
    rateLimitWindowMs: envNumber("CLOUD_COMPILER_RATE_LIMIT_WINDOW_MS", DEFAULT_RATE_LIMIT_WINDOW_MS),
    buildMemoryBytes: envNumber("CLOUD_COMPILER_BUILD_MEMORY_BYTES", DEFAULT_BUILD_MEMORY_BYTES),
    buildCpuSeconds: envNumber("CLOUD_COMPILER_BUILD_CPU_SECONDS", DEFAULT_BUILD_CPU_SECONDS),
  };
}
