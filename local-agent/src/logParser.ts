import { LogEntry } from "./types";

// Matches lines produced by `-file-line-error`, e.g.:
//   ./main.tex:12: Undefined control sequence.
const FILE_LINE_RE = /^\.?\/?(?<file>[^:\n]+\.(?:tex|sty|cls|bib)):(?<line>\d+):\s*(?<message>.+)$/;

/**
 * Best-effort parse of latexmk/pdftex log output into structured LogEntry
 * records. This is intentionally forgiving: LaTeX's log format is not
 * strictly line-oriented, so we track the most recently seen file/line
 * context and attach it to warnings that follow shortly after.
 */
export function parseLatexLog(output: string): LogEntry[] {
  const lines = output.split(/\r?\n/);
  const entries: LogEntry[] = [];
  let lastFile: string | undefined;
  let lastLine: number | undefined;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim()) continue;

    const m = FILE_LINE_RE.exec(line);
    if (m && m.groups) {
      const file = m.groups.file;
      const lineNo = parseInt(m.groups.line, 10);
      const message = m.groups.message.trim();
      lastFile = file;
      lastLine = Number.isFinite(lineNo) ? lineNo : undefined;
      entries.push({
        severity: /warning/i.test(message) ? "warning" : "error",
        message,
        file,
        line: lastLine,
      });
      continue;
    }

    if (/warning/i.test(line)) {
      entries.push({
        severity: "warning",
        message: line.trim(),
        file: lastFile,
        line: lastLine,
      });
      continue;
    }

    if (/^!\s/.test(line)) {
      entries.push({
        severity: "error",
        message: line.trim(),
        file: lastFile,
        line: lastLine,
      });
      continue;
    }

    if (
      /^Output written on /.test(line) ||
      /^Latexmk:/.test(line) ||
      /^This is /.test(line) ||
      /^No pages of output\./.test(line)
    ) {
      entries.push({ severity: "info", message: line.trim() });
      continue;
    }
  }

  return entries;
}
