"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Compartment, StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  BoldIcon,
  Heading1Icon,
  ItalicIcon,
  MessageSquarePlusIcon,
  PencilLineIcon,
  ScanEyeIcon,
  UnderlineIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useWorkspaceStore } from "@/store/workspace-store";
import { createComment } from "@/lib/mock-api/collaboration";
import { wrapSelection } from "@/components/latex/latex-utils";

const selectionCompartment = new Compartment();
const installedViews = new WeakSet<EditorView>();

interface SelectionInfo {
  from: number;
  to: number;
  text: string;
  left: number;
  top: number;
}

export function SelectionToolbar() {
  const editorHandle = useWorkspaceStore((s) => s.editorHandle);
  const activeFileId = useWorkspaceStore((s) => s.activeFileId);
  const projectId = useWorkspaceStore((s) => s.projectId);
  const setActiveSidePanel = useWorkspaceStore((s) => s.setActiveSidePanel);
  const setSyncTargetLine = useWorkspaceStore((s) => s.setSyncTargetLine);

  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const selectionRef = useRef<SelectionInfo | null>(null);
  const [commenting, setCommenting] = useState(false);

  useEffect(() => {
    (() => {
      setSelection(null);
      selectionRef.current = null;
    })();
    if (!editorHandle) return;
    const view = editorHandle.getView();
    if (!view) return;

    const listener = EditorView.updateListener.of((update) => {
      if (!update.selectionSet && !update.docChanged) return;
      const range = update.state.selection.main;
      if (range.empty) {
        if (selectionRef.current) {
          selectionRef.current = null;
          setSelection(null);
        }
        return;
      }
      const coords = update.view.coordsAtPos(range.head);
      if (!coords) return;
      const info: SelectionInfo = {
        from: range.from,
        to: range.to,
        text: update.state.sliceDoc(range.from, range.to),
        left: coords.left,
        top: coords.top,
      };
      selectionRef.current = info;
      setSelection(info);
    });

    if (!installedViews.has(view)) {
      installedViews.add(view);
      view.dispatch({ effects: StateEffect.appendConfig.of([selectionCompartment.of(listener)]) });
    } else {
      view.dispatch({ effects: selectionCompartment.reconfigure(listener) });
    }
  }, [editorHandle, activeFileId]);

  if (!selection || !activeFileId || !projectId) return null;

  async function handleComment() {
    if (!selection || !activeFileId || !projectId) return;
    setCommenting(true);
    try {
      await createComment(projectId, activeFileId, {
        anchorFrom: selection.from,
        anchorTo: selection.to,
        quotedText: selection.text.slice(0, 200),
        text: "",
        mentions: [],
      });
      setActiveSidePanel("comments");
      toast.success("Comment started — finish it in the Comments panel");
    } finally {
      setCommenting(false);
      setSelection(null);
    }
  }

  function handleSuggestEdit() {
    setActiveSidePanel("comments");
    toast.info("Switched to review mode — track your change in the Comments panel's Track changes tab");
  }

  function handleJumpToPdf() {
    if (!editorHandle || !activeFileId || !selection) return;
    const view = editorHandle.getView();
    if (!view) return;
    const line = view.state.doc.lineAt(selection.from).number;
    setSyncTargetLine({ fileId: activeFileId, line });
  }

  // Word/Office-style "activate a command right after selecting text":
  // wraps the current selection in a LaTeX command pair, using the same
  // wrapSelection helper the main toolbar's Bold/Italic/Underline/Section
  // buttons use, so both apply formatting identically. The selection stays
  // on the original text after wrapping, so this toolbar stays open and
  // repositions instead of vanishing after one click.
  function format(before: string, after: string) {
    const view = editorHandle?.getView();
    if (!view) return;
    wrapSelection(view, before, after);
  }

  return (
    <div
      style={{ left: selection.left, top: selection.top - 44 }}
      className="fixed z-50 flex items-center gap-0.5 rounded-lg border border-border-strong bg-popover p-1 text-popover-foreground shadow-lg"
    >
      <Button variant="ghost" size="icon-sm" title="Bold" onClick={() => format("\\textbf{", "}")}>
        <BoldIcon />
      </Button>
      <Button variant="ghost" size="icon-sm" title="Italic" onClick={() => format("\\textit{", "}")}>
        <ItalicIcon />
      </Button>
      <Button variant="ghost" size="icon-sm" title="Underline" onClick={() => format("\\underline{", "}")}>
        <UnderlineIcon />
      </Button>
      <Button variant="ghost" size="icon-sm" title="Section" onClick={() => format("\\section{", "}")}>
        <Heading1Icon />
      </Button>

      <Separator orientation="vertical" className="mx-0.5 h-5" />

      <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" disabled={commenting} onClick={handleComment}>
        <MessageSquarePlusIcon className="size-3.5" />
        Comment
      </Button>
      <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={handleSuggestEdit}>
        <PencilLineIcon className="size-3.5" />
        Suggest edit
      </Button>
      <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={handleJumpToPdf}>
        <ScanEyeIcon className="size-3.5" />
        Jump to PDF
      </Button>
    </div>
  );
}
