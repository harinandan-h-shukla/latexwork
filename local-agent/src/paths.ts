import path from "node:path";

const SAFE_PROJECT_ID_RE = /^[a-zA-Z0-9_-]+$/;

export function isSafeProjectId(projectId: unknown): projectId is string {
  return typeof projectId === "string" && SAFE_PROJECT_ID_RE.test(projectId);
}

/**
 * A "safe" relative path: not absolute, no ".." segments, no empty
 * segments (which would arise from a leading "/" or "//" sequences).
 */
export function isSafeRelativePath(candidate: unknown): candidate is string {
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  if (path.isAbsolute(candidate)) return false;
  if (candidate.includes("\0")) return false;
  const segments = candidate.split(/[/\\]/);
  if (segments.some((seg) => seg === "..")) return false;
  if (segments.some((seg) => seg === "")) return false;
  return true;
}

/**
 * Defense-in-depth: after resolving `relativePath` against `baseDir`,
 * confirm the resolved absolute path is still inside baseDir.
 */
export function resolveInside(baseDir: string, relativePath: string): string | null {
  const base = path.resolve(baseDir);
  const resolved = path.resolve(base, relativePath);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    return null;
  }
  return resolved;
}
