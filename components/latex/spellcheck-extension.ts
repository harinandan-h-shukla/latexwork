import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder, type Extension } from "@codemirror/state";

export const MOCK_MISSPELLED_WORDS = [
  "teh",
  "recieve",
  "adress",
  "seperate",
  "occured",
  "thier",
  "definately",
  "accross",
  "wich",
  "occassion",
  "publically",
  "arguement",
];

export interface SpellcheckContextMenuInfo {
  word: string;
  from: number;
  to: number;
  x: number;
  y: number;
}

function isMisspelled(word: string, customDictionary: Set<string>): boolean {
  const lower = word.toLowerCase();
  return MOCK_MISSPELLED_WORDS.includes(lower) && !customDictionary.has(lower);
}

function buildDecorations(view: EditorView, customDictionary: Set<string>): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const wordRegex = /[a-zA-Z]+/g;
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    let match: RegExpExecArray | null;
    wordRegex.lastIndex = 0;
    while ((match = wordRegex.exec(text)) !== null) {
      const start = from + match.index;
      if (view.state.sliceDoc(Math.max(0, start - 1), start) === "\\") continue;
      if (isMisspelled(match[0], customDictionary)) {
        builder.add(start, start + match[0].length, Decoration.mark({ class: "cm-spellcheck-error" }));
      }
    }
  }
  return builder.finish();
}

export interface SpellcheckOptions {
  enabled: boolean;
  customDictionary: Set<string>;
  onContextMenu: (info: SpellcheckContextMenuInfo) => void;
}

export function createSpellcheckExtension(options: SpellcheckOptions): Extension {
  if (!options.enabled) return [];

  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildDecorations(view, options.customDictionary);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view, options.customDictionary);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
      eventHandlers: {
        contextmenu(event, view) {
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
          if (pos == null) return false;
          const line = view.state.doc.lineAt(pos);
          const text = line.text;
          const offset = pos - line.from;
          const wordRegex = /[a-zA-Z]+/g;
          let match: RegExpExecArray | null;
          while ((match = wordRegex.exec(text)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            if (offset >= start && offset <= end) {
              if (isMisspelled(match[0], options.customDictionary)) {
                event.preventDefault();
                options.onContextMenu({
                  word: match[0],
                  from: line.from + start,
                  to: line.from + end,
                  x: event.clientX,
                  y: event.clientY,
                });
                return true;
              }
              break;
            }
          }
          return false;
        },
      },
    }
  );

  const theme = EditorView.baseTheme({
    ".cm-spellcheck-error": {
      backgroundImage:
        "linear-gradient(45deg, transparent 65%, #e11d48 80%, transparent 90%), linear-gradient(135deg, transparent 5%, #e11d48 15%, transparent 25%), linear-gradient(45deg, transparent 45%, #e11d48 60%, transparent 70%), linear-gradient(135deg, transparent 25%, #e11d48 35%, transparent 50%)",
      backgroundPosition: "bottom left",
      backgroundRepeat: "repeat-x",
      backgroundSize: "0.5em 0.3em",
      paddingBottom: "1px",
    },
  });

  return [plugin, theme];
}
