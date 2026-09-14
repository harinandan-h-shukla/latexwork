"use client";

import Link from "next/link";
import {
  SparklesIcon,
  BookMarkedIcon,
  SearchIcon,
  MessageSquareIcon,
  CheckCircleIcon,
  NotebookPenIcon,
  MoreHorizontalIcon,
  MessagesSquareIcon,
  TerminalIcon,
  HistoryIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore, type SidePanelId } from "@/store/workspace-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const RAIL_ITEMS: Array<{ id: SidePanelId; label: string; shortcut?: string; icon: typeof SparklesIcon }> = [
  { id: "papers", label: "Research", icon: SparklesIcon },
  { id: "reference", label: "References", shortcut: "⌘⇧C", icon: BookMarkedIcon },
  { id: "search", label: "Search", icon: SearchIcon },
  { id: "comments", label: "Comments", icon: MessageSquareIcon },
  { id: "review", label: "Review", icon: CheckCircleIcon },
  { id: "notes", label: "Notes", icon: NotebookPenIcon },
];

/** Right-hand utility rail — a narrow, always-visible column of contextual
 * panels (mirrored on the left by EditorToolsRail). Clicking an icon opens
 * an adjacent panel without navigating away or resizing the manuscript/PDF;
 * see SidePanelHost. "More" is the one exception — a plain dropdown for
 * low-frequency actions (chat, compile log, version history, compiler
 * settings) rather than another persistent panel. */
export function SidePanelRail({ projectId }: { projectId: string }) {
  const activeSidePanel = useWorkspaceStore((s) => s.activeSidePanel);
  const setActiveSidePanel = useWorkspaceStore((s) => s.setActiveSidePanel);
  const cursorContext = useWorkspaceStore((s) => s.cursorContext);

  return (
    <div className="glass-surface-subtle flex w-16 shrink-0 flex-col items-center gap-1.5 border-l py-2">
      {RAIL_ITEMS.map(({ id, label, shortcut, icon: Icon }) => {
        const active = activeSidePanel === id;
        const isLiveCiteContext = id === "reference" && !!cursorContext && !active;
        return (
          <button
            key={id}
            title={isLiveCiteContext ? `Reference: ${cursorContext?.key}` : `${label}${shortcut ? ` (${shortcut})` : ""}`}
            onClick={() => setActiveSidePanel(id)}
            className={cn(
              "flex size-10 flex-col items-center justify-center gap-0.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground",
              active && "bg-accent text-foreground",
              isLiveCiteContext && "text-primary"
            )}
          >
            <Icon className="size-5" />
            <span className="text-[9px] leading-none">{label}</span>
          </button>
        );
      })}

      <div className="mt-auto flex flex-col items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                title="More"
                className="flex size-10 flex-col items-center justify-center gap-0.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              />
            }
          >
            <MoreHorizontalIcon className="size-5" />
            <span className="text-[9px] leading-none">More</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="left" align="end">
            <DropdownMenuItem onClick={() => setActiveSidePanel("chat")}>
              <MessagesSquareIcon />
              Chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveSidePanel("log")}>
              <TerminalIcon />
              Compile log
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href={`/projects/${projectId}/history`} />}>
              <HistoryIcon />
              Version history
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings" />}>
              <SlidersHorizontalIcon />
              Local compiler settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
