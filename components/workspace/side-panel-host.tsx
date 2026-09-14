"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/store/workspace-store";
import { OutlinePanel } from "@/components/latex/outline-panel";
import { ReferenceDetailPanel } from "@/components/latex/reference-detail-panel";
import { ReferenceLibraryPanel } from "@/components/latex/reference-library-panel";
import { PapersSidePanel } from "@/components/latex/papers-side-panel";
import { NotesSidePanel } from "@/components/latex/notes-side-panel";
import { ReviewSidePanel } from "@/components/latex/review-side-panel";
import { SearchSidePanel } from "@/components/latex/search-side-panel";
import { CommentsPanel } from "@/components/collaboration/comments-panel";
import { ChatPanel } from "@/components/collaboration/chat-panel";
import { CompileLogPanel } from "@/components/compile/compile-log-panel";

const PANEL_TITLES: Record<string, string> = {
  outline: "Outline",
  reference: "References",
  papers: "Research",
  notes: "Notes",
  comments: "Comments",
  review: "Review",
  search: "Search",
  chat: "Chat",
  log: "Compile log",
};

export function SidePanelHost({ projectId }: { projectId: string }) {
  const activeSidePanel = useWorkspaceStore((s) => s.activeSidePanel);
  const setActiveSidePanel = useWorkspaceStore((s) => s.setActiveSidePanel);
  const cursorContext = useWorkspaceStore((s) => s.cursorContext);

  if (!activeSidePanel) return null;

  const showReferenceDetail = activeSidePanel === "reference" && cursorContext?.type === "cite";
  const title = showReferenceDetail ? cursorContext.key : PANEL_TITLES[activeSidePanel];

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l transition-[width,opacity] duration-200">
      <div className="glass-surface-subtle flex items-center justify-between border-b px-2 py-1.5">
        <span className="truncate text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => setActiveSidePanel(null)}
        >
          <XIcon className="size-3.5" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {activeSidePanel === "outline" && <OutlinePanel projectId={projectId} />}
        {activeSidePanel === "reference" &&
          (showReferenceDetail ? (
            <ReferenceDetailPanel key={cursorContext.key} projectId={projectId} citeKey={cursorContext.key} />
          ) : (
            <ReferenceLibraryPanel projectId={projectId} />
          ))}
        {activeSidePanel === "papers" && <PapersSidePanel projectId={projectId} />}
        {activeSidePanel === "notes" && <NotesSidePanel projectId={projectId} />}
        {activeSidePanel === "review" && <ReviewSidePanel projectId={projectId} />}
        {activeSidePanel === "search" && <SearchSidePanel projectId={projectId} />}
        {activeSidePanel === "comments" && <CommentsPanel projectId={projectId} />}
        {activeSidePanel === "chat" && <ChatPanel projectId={projectId} />}
        {activeSidePanel === "log" && <CompileLogPanel projectId={projectId} />}
      </div>
    </div>
  );
}
