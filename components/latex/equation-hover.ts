import { hoverTooltip, type Tooltip } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import katex from "katex";

function findMathSpan(text: string, offset: number): { from: number; to: number; source: string } | null {
  const patterns: Array<{ open: string; close: string; strip: boolean }> = [
    { open: "\\[", close: "\\]", strip: false },
    { open: "\\(", close: "\\)", strip: false },
    { open: "$$", close: "$$", strip: false },
    { open: "$", close: "$", strip: false },
  ];

  for (const { open, close } of patterns) {
    let searchFrom = 0;
    while (true) {
      const start = text.indexOf(open, searchFrom);
      if (start === -1) break;
      const contentStart = start + open.length;
      const end = text.indexOf(close, contentStart);
      if (end === -1) break;
      if (offset >= start && offset <= end + close.length) {
        return { from: start, to: end + close.length, source: text.slice(contentStart, end) };
      }
      searchFrom = end + close.length;
    }
  }
  return null;
}

export function createEquationHoverExtension(): Extension {
  return hoverTooltip((view, pos): Tooltip | null => {
    const line = view.state.doc.lineAt(pos);
    const offset = pos - line.from;
    const span = findMathSpan(line.text, offset);
    if (!span || !span.source.trim()) return null;

    return {
      pos: line.from + span.from,
      end: line.from + span.to,
      above: true,
      create() {
        const dom = document.createElement("div");
        dom.className = "cm-equation-preview rounded-md border bg-popover p-2 text-popover-foreground shadow-md";
        try {
          katex.render(span.source, dom, { throwOnError: false, displayMode: true });
        } catch {
          dom.textContent = "Could not render equation";
        }
        return { dom };
      },
    };
  });
}
