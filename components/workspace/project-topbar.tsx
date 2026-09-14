"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ColumnsIcon,
  ExternalLinkIcon,
  FocusIcon,
  LayoutIcon,
  PanelLeftCloseIcon,
  PanelRightCloseIcon,
  PencilIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareButton } from "@/components/collaboration/share-button";
import { ExportMenu } from "@/components/export/export-menu";
import { InkwellLogo } from "@/components/shell/inkwell-logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { useWorkspaceStore, type LayoutMode } from "@/store/workspace-store";
import { updateProject } from "@/lib/mock-api/projects";

interface ProjectTopbarProps {
  projectId: string;
  projectName: string;
}

const LAYOUT_OPTIONS: { mode: LayoutMode; label: string; icon: typeof ColumnsIcon }[] = [
  { mode: "split", label: "Split view", icon: ColumnsIcon },
  { mode: "editor-only", label: "Editor only", icon: PanelRightCloseIcon },
  { mode: "pdf-only", label: "PDF only", icon: PanelLeftCloseIcon },
];

export function ProjectTopbar({ projectId, projectName }: ProjectTopbarProps) {
  const pathname = usePathname();
  const [name, setName] = useState(projectName);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(projectName);

  const layoutMode = useWorkspaceStore((s) => s.layoutMode);
  const setLayoutMode = useWorkspaceStore((s) => s.setLayoutMode);
  const focusMode = useWorkspaceStore((s) => s.focusMode);
  const setFocusMode = useWorkspaceStore((s) => s.setFocusMode);
  const pdfUrl = useWorkspaceStore((s) => s.compile?.pdfUrl ?? null);

  const tabs = [
    { href: `/projects/${projectId}/overview`, label: "Overview" },
    { href: `/projects/${projectId}`, label: "Manuscript" },
    { href: `/projects/${projectId}/research`, label: "Research" },
    { href: `/projects/${projectId}/references`, label: "References" },
    { href: `/projects/${projectId}/figures`, label: "Figures" },
    { href: `/projects/${projectId}/review`, label: "Review" },
    { href: `/projects/${projectId}/history`, label: "Versions" },
  ];
  const isEditorTab = pathname === `/projects/${projectId}`;

  async function commitRename() {
    setRenaming(false);
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === name) {
      setDraftName(name);
      return;
    }
    setName(trimmed);
    await updateProject(projectId, { name: trimmed });
    toast.success("Project renamed");
  }

  if (focusMode) {
    return (
      <div className="flex items-center gap-2 border-b bg-background px-3 py-1">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground"
          onClick={() => setFocusMode(false)}
        >
          <FocusIcon className="size-3.5" />
          Exit focus mode
        </Button>
        <span className="truncate text-xs text-muted-foreground">{name}</span>
      </div>
    );
  }

  return (
    <div className="glass-surface flex items-center gap-4 border-b px-3 py-1.5">
      <Link
        href="/projects"
        className="flex shrink-0 items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        title="Back to dashboard"
      >
        <InkwellLogo size="sm" />
      </Link>
      <Link
        href="/projects"
        className="flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        title="Back to dashboard"
      >
        <ArrowLeftIcon className="size-4" />
      </Link>
      {renaming ? (
        <Input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setDraftName(name);
              setRenaming(false);
            }
          }}
          className="h-6 w-48 px-1.5 text-sm"
        />
      ) : (
        <button
          onClick={() => setRenaming(true)}
          className="group flex items-center gap-1.5 truncate text-sm font-medium hover:text-foreground"
          title="Rename project"
        >
          <span className="truncate">{name}</span>
          <PencilIcon className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
        </button>
      )}
      <nav className="ml-2 flex items-center gap-1">
        {tabs.map((tab) => {
          const active =
            tab.label === "Manuscript" ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-md px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                active && "bg-accent text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        {isEditorTab && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-1" />}>
              <LayoutIcon className="size-3.5 text-indigo-500" />
              Layout
              <ChevronDownIcon className="size-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LAYOUT_OPTIONS.map(({ mode, label, icon: Icon }) => (
                <DropdownMenuItem key={mode} onClick={() => setLayoutMode(mode)}>
                  <Icon />
                  {label}
                  {layoutMode === mode && <CheckIcon className="ml-auto size-3.5" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                disabled={!pdfUrl}
                onClick={() => pdfUrl && window.open(pdfUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLinkIcon />
                Open PDF in separate tab
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFocusMode(true)}>
                <FocusIcon />
                Focus mode
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <ExportMenu projectId={projectId} />
        <ShareButton projectId={projectId} />
        <ThemeToggle />
      </div>
    </div>
  );
}
