import { useWorkspaceStore } from "@/store/workspace-store";

/**
 * Opens a file (if not already open) and scrolls to a line once the editor
 * view for that file has mounted. CodeEditor remounts on file switch, so we
 * briefly poll the store for the freshly-registered imperative handle.
 */
export async function jumpToFileLine(fileId: string, line: number): Promise<void> {
  await useWorkspaceStore.getState().openFile(fileId);
  for (let attempt = 0; attempt < 20; attempt++) {
    const state = useWorkspaceStore.getState();
    if (state.activeFileId === fileId && state.editorHandle) {
      state.editorHandle.scrollToLine(line);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
