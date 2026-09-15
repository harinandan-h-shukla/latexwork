"use client";

import { useIsDesktopApp } from "@/lib/runtime/use-is-desktop-app";
import { EditorWorkspace } from "@/components/workspace/editor-workspace";
import { ProjectViewOnlyWorkspace } from "@/components/workspace/project-view-only-workspace";

/**
 * Switches between the two "what does /projects/[id] render" experiences
 * confirmed for Phase 3 (~/.claude/plans/cozy-spinning-toucan.md): the
 * desktop app (Tauri webview, isTauri() true) still gets the full CodeMirror
 * editor + compile toolbar; every ordinary browser tab against the
 * Vercel-hosted site gets the view-only workspace (file list, last compiled
 * PDF, zip download, chat/comments-read-only). This is the only file that
 * needs to know both exist — neither EditorWorkspace nor
 * ProjectViewOnlyWorkspace reference each other or this gate.
 */
export function ProjectWorkspaceGate({ projectId }: { projectId: string }) {
  const isDesktop = useIsDesktopApp();
  // isDesktop === null: not yet determined (first client tick). Default to
  // view-only — see useIsDesktopApp's doc comment for why that's the safer
  // direction to flash briefly, not the editor.
  return isDesktop ? <EditorWorkspace projectId={projectId} /> : <ProjectViewOnlyWorkspace projectId={projectId} />;
}
