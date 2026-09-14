"use client";

import Link from "next/link";
import {
  SparklesIcon,
  BookMarkedIcon,
  SearchIcon,
  MessageSquareIcon,
  CheckCircleIcon,
  NotebookPenIcon,
  MessagesSquareIcon,
  TerminalIcon,
  MoreHorizontalIcon,
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

const RAIL_ITEMS: Array<{ id: SidePanelId; label: string; shortcut?: string; icon: typeof SparklesIcon; color: string }> = [
  { id: "papers", label: "Research", icon: SparklesIcon, color: "var(--icon-research)" },
  { id: "reference", label: "References", shortcut: "⌘⇧C", icon: BookMarkedIcon, color: "var(--icon-reference)" },
  { id: "search", label: "Search", icon: SearchIcon, color: "var(--icon-search)" },
  { id: "comments", label: "Comments", icon: MessageSquareIcon, color: "var(--icon-comments)" },
  { id: "review", label: "Review", icon: CheckCircleIcon, color: "var(--icon-review)" },
  { id: "notes", label: "Notes", icon: NotebookPenIcon, color: "var(--icon-notes)" },
  // Promoted out of the "More" dropdown — they used to show only as text
  // rows there (no color, no presence in the rail itself), which is what
  // read as an undifferentiated "dot" next to the properly-iconed panels.
  { id: "chat", label: "Chat", icon: MessagesSquareIcon, color: "var(--icon-chat)" },
  { id: "log", label: "Log", icon: TerminalIcon, color: "var(--icon-log)" },
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
      {RAIL_ITEMS.map(({ id, label, shortcut, icon: Icon, color }) => {
        const active = activeSidePanel === id;
        const isLiveCiteContext = id === "reference" && !!cursorContext && !active;
        return (
          <button
            key={id}
            title={isLiveCiteContext ? `Reference: ${cursorContext?.key}` : `${label}${shortcut ? ` (${shortcut})` : ""}`}
            onClick={() => setActiveSidePanel(id)}
            className={cn(
              "flex size-10 flex-col items-center justify-center gap-0.5 rounded-md text-muted-foreground hover:bg-accent",
              active && "bg-accent",
              isLiveCiteContext && "ring-1 ring-primary/40"
            )}
          >
            <Icon className="size-5" style={{ color }} />
            <span className="text-[9px] leading-none text-foreground">{label}</span>
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
            <DropdownMenuItem render={<Link href={`/projects/${projectId}/history`} />}>
              <HistoryIcon className="text-violet-500" />
              Version history
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings" />}>
              <SlidersHorizontalIcon className="text-slate-500" />
              Local compiler settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
