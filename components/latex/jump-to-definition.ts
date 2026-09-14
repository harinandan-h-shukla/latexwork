import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";

export interface JumpTarget {
  kind: "ref" | "cite";
  command: string;
  name: string;
}

export function createJumpToDefinitionExtension(onJump: (target: JumpTarget) => void): Extension {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      if (!(event.ctrlKey || event.metaKey)) return false;
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos == null) return false;
      const line = view.state.doc.lineAt(pos);
      const text = line.text;
      const offset = pos - line.from;

      const regex = /\\(ref|eqref|autoref|cref|cite[tp]?\*?)(?:\[[^\]]*\])?\{([^}]+)\}/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (offset < start || offset > end) continue;
        const command = match[1];
        const isCite = command.startsWith("cite");
        const names = match[2].split(",").map((n) => n.trim());
        const braceOffset = offset - (start + match[0].indexOf("{") + 1);
        let name = names[0];
        if (isCite && names.length > 1) {
          let acc = 0;
          for (const n of names) {
            acc += n.length + 1;
            if (braceOffset <= acc) {
              name = n;
              break;
            }
          }
        }
        event.preventDefault();
        onJump({ kind: isCite ? "cite" : "ref", command, name });
        return true;
      }
      return false;
    },
  });
}
