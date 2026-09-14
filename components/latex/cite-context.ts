import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import type { CursorContext } from "@/store/workspace-store";

const CITE_MATCH = /\\cite[tp]?\*?(?:\[[^\]]*\])?\{([^}]*)\}/g;

/** Finds the \cite{...} (if any) whose braces contain the given doc offset, returning the single nearest key. */
export function findCiteContextAt(doc: string, pos: number): CursorContext {
  CITE_MATCH.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CITE_MATCH.exec(doc)) !== null) {
    const braceOpen = match.index + match[0].indexOf("{");
    const braceClose = braceOpen + 1 + match[1].length;
    if (pos < braceOpen || pos > braceClose) continue;

    const keys = match[1].split(",").map((k) => k.trim());
    if (keys.length === 1) return { type: "cite", key: keys[0] };

    // Multiple comma-separated keys: pick whichever one the cursor is actually over.
    let cursor = braceOpen + 1;
    for (const rawKey of match[1].split(",")) {
      const keyStart = cursor;
      const keyEnd = cursor + rawKey.length;
      if (pos >= keyStart && pos <= keyEnd) return { type: "cite", key: rawKey.trim() };
      cursor = keyEnd + 1; // +1 for the comma
    }
    return { type: "cite", key: keys[0] };
  }
  return null;
}

/** Reports the \cite{} the cursor is currently inside (or null) so the workspace store can drive a contextual side panel. */
export function createCiteContextExtension(onContextChange: (context: CursorContext) => void) {
  return ViewPlugin.fromClass(
    class {
      constructor(view: EditorView) {
        onContextChange(findCiteContextAt(view.state.doc.toString(), view.state.selection.main.head));
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet) {
          onContextChange(
            findCiteContextAt(update.state.doc.toString(), update.state.selection.main.head),
          );
        }
      }
    },
  );
}
