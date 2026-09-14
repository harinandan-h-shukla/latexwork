import { execFile } from "node:child_process";

/**
 * Parses the first "SyncTeX result begin ... end" block's Key:Value lines
 * (verified against real `synctex view`/`edit` output — see local-agent's
 * commit history for the raw CLI output this was checked against). A query
 * can return several records; per `synctex help view`'s own text, "the
 * first one is the most accurate," so later records are ignored — detected
 * by a second "Output:" key, which always starts a new record.
 */
function parseFirstRecord(output: string): Map<string, string> {
  const lines = output.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === "SyncTeX result begin");
  const record = new Map<string, string>();
  if (start === -1) return record;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "SyncTeX result end") break;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx);
    if (key === "Output" && record.has("Output")) break;
    record.set(key, line.slice(idx + 1));
  }
  return record;
}

export interface ForwardResult {
  page: number;
  /** Points (72 dpi), top-left origin — synctex's own convention. */
  x: number;
  y: number;
}

export interface InverseResult {
  /** Relative to `cwd`, since synctex returns an absolute path and the
   * caller only knows files by their project-relative path. */
  file: string;
  line: number;
}

export function synctexForward(
  cwd: string,
  pdfRelPath: string,
  sourceRelPath: string,
  line: number
): Promise<ForwardResult | null> {
  return new Promise((resolve) => {
    execFile(
      "synctex",
      ["view", "-i", `${line}:0:${sourceRelPath}`, "-o", pdfRelPath],
      { cwd, timeout: 5000 },
      (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        const record = parseFirstRecord(stdout);
        const page = Number(record.get("Page"));
        const x = Number(record.get("x"));
        const y = Number(record.get("y"));
        resolve(Number.isFinite(page) && Number.isFinite(x) && Number.isFinite(y) ? { page, x, y } : null);
      }
    );
  });
}

export function synctexInverse(
  cwd: string,
  pdfRelPath: string,
  page: number,
  x: number,
  y: number
): Promise<InverseResult | null> {
  return new Promise((resolve) => {
    execFile(
      "synctex",
      ["edit", "-o", `${page}:${x}:${y}:${pdfRelPath}`],
      { cwd, timeout: 5000 },
      (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        const record = parseFirstRecord(stdout);
        const input = record.get("Input");
        const line = Number(record.get("Line"));
        if (!input || !Number.isFinite(line)) {
          resolve(null);
          return;
        }
        // synctex returns an absolute path (often with a "./" component,
        // e.g. ".../workdir/./main.tex") — normalize back to cwd-relative.
        const normalizedCwd = cwd.endsWith("/") ? cwd : `${cwd}/`;
        const relative = input.replace(normalizedCwd, "").replace(/^\.\//, "");
        resolve({ file: relative, line });
      }
    );
  });
}
