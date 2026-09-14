import type { Diagnostic } from "@codemirror/lint";
import type { EditorView } from "@codemirror/view";
import { findUnmatchedBraces, findUnmatchedEnvironments, findLabels, findRefs } from "@/components/latex/latex-utils";

function lineOffset(view: EditorView, line: number, ch: number): number {
  const clamped = Math.min(Math.max(line, 1), view.state.doc.lines);
  const info = view.state.doc.line(clamped);
  return Math.min(info.from + ch, info.to);
}

export function latexLintSource(view: EditorView): Diagnostic[] {
  const content = view.state.doc.toString();
  const diagnostics: Diagnostic[] = [];

  for (const issue of findUnmatchedBraces(content)) {
    const from = lineOffset(view, issue.line, issue.ch);
    diagnostics.push({ from, to: from + 1, severity: "error", message: issue.message, source: "latex" });
  }

  for (const issue of findUnmatchedEnvironments(content)) {
    const from = lineOffset(view, issue.line, 0);
    const info = view.state.doc.line(Math.min(issue.line, view.state.doc.lines));
    diagnostics.push({ from, to: info.to, severity: "error", message: issue.message, source: "latex" });
  }

  const labelNames = new Set(findLabels(content).map((l) => l.name));
  for (const ref of findRefs(content)) {
    if (labelNames.has(ref.name)) continue;
    const line = view.state.doc.line(Math.min(ref.line, view.state.doc.lines));
    diagnostics.push({
      from: line.from,
      to: line.to,
      severity: "warning",
      message: `Undefined label "${ref.name}" referenced by \\${ref.command}`,
      source: "latex",
    });
  }

  return diagnostics.sort((a, b) => a.from - b.from);
}
