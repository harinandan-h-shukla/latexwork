import { execFile } from "node:child_process";

// Ported from local-agent/src/synctex.ts (verified there against real
// `synctex view`/`edit` CLI output) — identical logic, this service just
// runs it against a per-build workDir instead of a per-project one.

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
  x: number;
  y: number;
}

export interface InverseResult {
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
        const normalizedCwd = cwd.endsWith("/") ? cwd : `${cwd}/`;
        const relative = input.replace(normalizedCwd, "").replace(/^\.\//, "");
        resolve({ file: relative, line });
      }
    );
  });
}
