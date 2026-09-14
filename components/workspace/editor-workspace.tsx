"use client";

import { useEffect, useRef } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ManuscriptNav } from "@/components/workspace/manuscript-nav";
import { EditorTabs } from "@/components/workspace/editor-tabs";
import { CodeEditor } from "@/components/editor/code-editor";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { EditorToolsRail } from "@/components/editor/editor-tools-rail";
import { useEditorToolsState } from "@/components/editor/use-editor-tools-state";
import { SelectionToolbar } from "@/components/latex/selection-toolbar";
import { CitationPickerDialog } from "@/components/latex/citation-picker-dialog";
import { CompileToolbar } from "@/components/compile/compile-toolbar";
import { PdfPreview } from "@/components/pdf/pdf-preview";
import { SidePanelRail } from "@/components/workspace/side-panel-rail";
import { SidePanelHost } from "@/components/workspace/side-panel-host";
import { useWorkspaceStore } from "@/store/workspace-store";
import { closeLocalProject } from "@/lib/local-compiler/local-compiler-client";

export function EditorWorkspace({ projectId }: { projectId: string }) {
  const loadProject = useWorkspaceStore((s) => s.loadProject);
  const activeFileId = useWorkspaceStore((s) => s.activeFileId);
  const fileContents = useWorkspaceStore((s) => s.fileContents);
  const setFileContent = useWorkspaceStore((s) => s.setFileContent);
  const saveFileContent = useWorkspaceStore((s) => s.saveFileContent);
  const compile = useWorkspaceStore((s) => s.compile);
  const isCompiling = useWorkspaceStore((s) => s.isCompiling);
  const setEditorHandle = useWorkspaceStore((s) => s.setEditorHandle);
  const layoutMode = useWorkspaceStore((s) => s.layoutMode);
  const focusMode = useWorkspaceStore((s) => s.focusMode);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tools = useEditorToolsState();

  useEffect(() => {
    loadProject(projectId);
    return () => {
      closeLocalProject(projectId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function handleChange(fileId: string, content: string) {
    setFileContent(fileId, content);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveFileContent(fileId), 600);
  }

  // The 600ms debounce above leaves a real window where a closed tab loses
  // the last edit — flush immediately (skip the debounce) whenever the tab
  // is hidden/backgrounded, not just on a full unload, since that covers
  // switching tabs, minimizing, and most real "closed it" scenarios too.
  // beforeunload additionally warns the user (native browser confirm) if a
  // save is still in flight when they try to close, buying it time to land
  // instead of racing the page teardown.
  useEffect(() => {
    function flushDirtySaves() {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const state = useWorkspaceStore.getState();
      for (const fileId of state.dirtyFileIds) {
        void state.saveFileContent(fileId);
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") flushDirtySaves();
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (useWorkspaceStore.getState().dirtyFileIds.size === 0) return;
      flushDirtySaves();
      event.preventDefault();
      event.returnValue = "";
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", flushDirtySaves);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", flushDirtySaves);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const showFileTree = !focusMode && layoutMode !== "pdf-only";
  const showPdf = layoutMode !== "editor-only";

  const editorColumn = (
    <div className="flex h-full min-h-0">
      {!focusMode && <EditorToolsRail tools={tools} />}
      <div className="flex min-h-0 flex-1 flex-col">
        <CompileToolbar />
        <EditorTabs />
        <EditorToolbar tools={tools} />
        <div className="min-h-0 flex-1">
          {activeFileId ? (
            <CodeEditor
              key={activeFileId}
              ref={setEditorHandle}
              fileId={activeFileId}
              value={fileContents[activeFileId] ?? ""}
              onChange={(content) => handleChange(activeFileId, content)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a file to start editing
            </div>
          )}
        </div>
      </div>
      {!focusMode && <SidePanelHost projectId={projectId} />}
      {!focusMode && <SidePanelRail />}
    </div>
  );

  return (
    <>
      <SelectionToolbar />
      <CitationPickerDialog />
      {layoutMode === "pdf-only" ? (
        <PdfPreview pdfUrl={compile?.pdfUrl ?? null} isCompiling={isCompiling} />
      ) : (
        <ResizablePanelGroup orientation="horizontal" className="h-full min-h-0">
          {showFileTree && (
            <>
              <ResizablePanel defaultSize="20" minSize="12" maxSize="35">
                <ManuscriptNav />
              </ResizablePanel>
              <ResizableHandle />
            </>
          )}
          <ResizablePanel defaultSize={showPdf ? "45" : "80"} minSize="25">
            {editorColumn}
          </ResizablePanel>
          {showPdf && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize="35" minSize="20">
                <PdfPreview pdfUrl={compile?.pdfUrl ?? null} isCompiling={isCompiling} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      )}
    </>
  );
}
