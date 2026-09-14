"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorSelection, EditorState, type Extension } from "@codemirror/state";
import { StreamLanguage, LanguageSupport, StreamParser } from "@codemirror/language";
import { stex as stexParser } from "@codemirror/legacy-modes/mode/stex";
import { keymap, type Command } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";

const stexLanguage = StreamLanguage.define(stexParser as StreamParser<unknown>);
const stexSupport = new LanguageSupport(stexLanguage, [
  stexLanguage.data.of({ commentTokens: { line: "%" } }),
]);

const joinLines: Command = (view) => {
  const { state } = view;
  const changes = state.changeByRange((range) => {
    const startLine = state.doc.lineAt(range.from);
    const endLine = state.doc.lineAt(range.to);
    const lastLine = Math.min(state.doc.lines, endLine.number + (range.empty ? 1 : 0));
    if (lastLine <= startLine.number) return { range };
    let pos = startLine.to;
    const changeList = [];
    for (let ln = startLine.number + 1; ln <= lastLine; ln++) {
      const line = state.doc.line(ln);
      const trimmedFrom = /^\s*/.exec(line.text)![0].length;
      changeList.push({ from: pos, to: line.from + trimmedFrom, insert: " " });
      pos = line.to;
    }
    return { changes: changeList, range: EditorSelection.cursor(startLine.to) };
  });
  view.dispatch(state.update(changes, { userEvent: "delete.joinLines" }));
  return true;
};

interface CodeEditorProps {
  fileId: string;
  value: string;
  onChange: (value: string) => void;
  extensions?: Extension[];
}

export interface CodeEditorHandle {
  scrollToLine: (line: number) => void;
  insertAtCursor: (text: string) => void;
  getView: () => EditorView | null;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  { fileId, value, onChange, extensions = [] },
  ref
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToLine: (line) => {
        const view = viewRef.current;
        if (!view) return;
        const clamped = Math.min(Math.max(line, 1), view.state.doc.lines);
        const lineInfo = view.state.doc.line(clamped);
        view.dispatch({
          selection: { anchor: lineInfo.from },
          effects: EditorView.scrollIntoView(lineInfo.from, { y: "center" }),
        });
        view.focus();
      },
      insertAtCursor: (text) => {
        const view = viewRef.current;
        if (!view) return;
        const { from, to } = view.state.selection.main;
        view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } });
        view.focus();
      },
      getView: () => viewRef.current,
    }),
    []
  );

  useEffect(() => {
    if (!hostRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        keymap.of([indentWithTab, { key: "Mod-Shift-j", run: joinLines }]),
        stexSupport,
        EditorView.theme({ "&": { fontFamily: "var(--font-mono)" }, ".cm-content": { fontFamily: "var(--font-mono)" } }),
        // Color theme is applied by EditorToolbar via the themeCompartment
        // (see editor-extensions.ts/applyExtensionState), not here — keeping
        // it out of this effect's deps means switching themes never remounts
        // the editor (and never resets scroll/cursor position), only
        // switching files does.
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        ...extensions,
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      // `value` can now change out from under an already-mounted, already-
      // active file: workspace-store's openFile optimistically paints a
      // locally cached copy of a file's content instantly, then replaces it
      // with the real getFileContent() result once that resolves — same
      // fileId throughout, so the mount effect above (keyed only on
      // fileId) never re-runs to pick it up. Without also depending on
      // `value` here, that real/authoritative content would land in the
      // store but never actually reach the screen. This never fires for
      // the user's own keystrokes (onChange already applied those directly
      // to this same view, so `current` already equals `value` by the time
      // this runs) — only for an external content replacement like the one
      // above, or the equivalent very first sync on a fresh mount.
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
        // Best-effort: keep the cursor near where it was rather than
        // snapping to the document start. There's no meaningful mapping
        // between old and new content here (they can differ arbitrarily),
        // so this is just "stay at roughly the same offset, clamped to the
        // new length" — good enough for the narrow, sub-second window this
        // covers, not a real diff/merge.
        selection: {
          anchor: Math.min(view.state.selection.main.anchor, value.length),
        },
      });
    }
  }, [fileId, value]);

  return <div ref={hostRef} className="h-full min-h-0 overflow-auto text-sm [&_.cm-editor]:h-full" />;
});
