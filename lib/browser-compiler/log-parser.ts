import type { LogSeverity } from "@/lib/types";

export interface ParsedLogLine {
  severity: LogSeverity;
  message: string;
  file?: string;
  line?: number;
}

// Matches lines produced by `-file-line-error`, e.g.:
//   ./main.tex:12: Undefined control sequence.
// Deliberately mirrors local-agent/src/logParser.ts's FILE_LINE_RE (adapted
// to plain capture groups — this app's tsconfig targets ES2017, and named
// capture groups need ES2018+; local-agent has its own separate tsconfig
// and is excluded from this one) — the raw pdftex/xetex/luahbtex log text
// texlyre-busytex hands back (its `CompileResult.log` field) is real TeX
// Live log output, in the same format the local agent's real
// pdflatex/xelatex/lualatex produce, so the same forgiving line-oriented
// parse applies. Not shared as an import because local-agent is a separate
// standalone package (its own tsconfig/build/deploy lifecycle) that this
// browser-only module has no business depending on.
const FILE_LINE_RE = /^\.?\/?([^:\n]+\.(?:tex|sty|cls|bib)):(\d+):\s*(.+)$/;

/**
 * Best-effort parse of pdftex/xetex/luahbtex log output into structured
 * entries. LaTeX's log format is not strictly line-oriented, so this
 * tracks the most recently seen file/line context and attaches it to
 * warnings that follow shortly after — same forgiving approach as the
 * local-agent's parser, kept consistent so log severity/file/line
 * attribution looks the same to the user regardless of which compile
 * source actually ran.
 */
export function parseLatexLog(output: string): ParsedLogLine[] {
  const lines = output.split(/\r?\n/);
  const entries: ParsedLogLine[] = [];
  let lastFile: string | undefined;
  let lastLine: number | undefined;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim()) continue;

    const m = FILE_LINE_RE.exec(line);
    if (m) {
      const file = m[1];
      const lineNo = parseInt(m[2], 10);
      const message = m[3].trim();
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
      entries.push({ severity: "warning", message: line.trim(), file: lastFile, line: lastLine });
      continue;
    }

    if (/^!\s/.test(line)) {
      entries.push({ severity: "error", message: line.trim(), file: lastFile, line: lastLine });
      continue;
    }

    if (
      /^Output written on /.test(line) ||
      /^This is /.test(line) ||
      /^No pages of output\./.test(line)
    ) {
      entries.push({ severity: "info", message: line.trim() });
      continue;
    }
  }

  return entries;
}
