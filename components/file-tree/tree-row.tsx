"use client";

import { useState, type CSSProperties, type DragEvent } from "react";
import {
  ChevronRightIcon,
  DownloadIcon,
  FileIcon,
  FilePlusIcon,
  FileTextIcon,
  FolderIcon,
  FolderPlusIcon,
  MoreHorizontalIcon,
  StarIcon,
} from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { TreeNode } from "@/components/file-tree/file-tree-utils";
import { isImageFile } from "@/components/file-tree/file-tree-utils";
import { FileThumbnail } from "@/components/file-tree/file-thumbnail";
import { INTERNAL_DRAG_MIME, useTreeContext } from "@/components/file-tree/tree-context";

function fileIcon(node: TreeNode) {
  if (isImageFile(node)) return <FileThumbnail file={node} />;
  if (node.isBinary) return <FileIcon className="size-4 text-muted-foreground" />;
  if (node.name.endsWith(".tex")) return <FileTextIcon className="size-4 text-primary" />;
  return <FileIcon className="size-4 text-muted-foreground" />;
}

// Cycling accent per nesting depth so a deeply-nested tree reads visually
// (a guide line's color tells you which ancestor folder it belongs to)
// instead of indentation alone, which gets hard to track past 2-3 levels.
const DEPTH_GUIDE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function depthGuideColor(depth: number): string {
  return DEPTH_GUIDE_COLORS[depth % DEPTH_GUIDE_COLORS.length];
}

// One thin vertical guide line per ancestor level, plus a faint full-row
// tint in that same depth's color, drawn as stacked background gradients
// on the row itself (not a nested wrapper) so each row's absolute
// depth-based paddingLeft stays the single source of truth for indentation
// — a wrapper-level margin would double-count depth on every nested level
// instead. Applies identically to folder rows and file rows, so a folder
// tree reads with the same ascending-by-depth coloring as its contents.
// The tint is a background *image* layer, not background-color, so it
// paints above the row's own bg-color (transparent at rest) but below
// nothing — the row's hover:/active bg-accent classes still show through
// underneath it since it's low-opacity.
function depthGuideStyle(depth: number): CSSProperties {
  if (depth === 0) return {};
  const images: string[] = [];
  const positions: string[] = [];
  const sizes: string[] = [];
  for (let i = 0; i < depth; i++) {
    const color = `color-mix(in oklch, ${depthGuideColor(i)} 45%, transparent)`;
    images.push(`linear-gradient(${color}, ${color})`);
    positions.push(`${i * 14 + 13}px 0`);
    sizes.push("1px 100%");
  }
  const tint = `color-mix(in oklch, ${depthGuideColor(depth - 1)} 12%, transparent)`;
  images.push(`linear-gradient(${tint}, ${tint})`);
  positions.push("0 0");
  sizes.push("100% 100%");
  return {
    backgroundImage: images.join(", "),
    backgroundPosition: positions.join(", "),
    backgroundSize: sizes.join(", "),
    backgroundRepeat: "no-repeat",
  };
}

export function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  // Folders default collapsed, not expanded — a project with a large
  // figures/ folder (common for a real paper) or a deeply nested imported
  // repo would otherwise render every descendant row on first mount, no
  // matter how many hundreds/thousands of files that is.
  const [expanded, setExpanded] = useState(false);
  const activeFileId = useWorkspaceStore((s) => s.activeFileId);
  const openFile = useWorkspaceStore((s) => s.openFile);
  const renameFileNode = useWorkspaceStore((s) => s.renameFileNode);
  const duplicateFileNode = useWorkspaceStore((s) => s.duplicateFileNode);
  const setMainFileNode = useWorkspaceStore((s) => s.setMainFileNode);
  const setFolderMainFileNode = useWorkspaceStore((s) => s.setFolderMainFileNode);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);

  const ctx = useTreeContext();
  const isFolder = node.type === "folder";
  const isActive = activeFileId === node.id;
  const isSelected = ctx.selectedIds.has(node.id);
  const isDropTarget = isFolder && ctx.dropTargetId === node.id;
  const isDragging = ctx.draggingId === node.id;

  async function commitRename() {
    setRenaming(false);
    if (renameValue.trim() && renameValue !== node.name) {
      await renameFileNode(node.id, renameValue.trim());
      toast.success("Renamed");
    }
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData(INTERNAL_DRAG_MIME, node.id);
    e.dataTransfer.setData("text/plain", node.id);
    e.dataTransfer.effectAllowed = "move";
    ctx.setDraggingId(node.id);
  }

  function handleDragEnd() {
    ctx.setDraggingId(null);
    ctx.setDropTargetId(null);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    if (!isFolder) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes("Files") ? "copy" : "move";
    ctx.setDropTargetId(node.id);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    if (!isFolder) return;
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (ctx.dropTargetId === node.id) ctx.setDropTargetId(null);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    if (!isFolder) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) {
      ctx.onFilesDroppedToFolder(e.dataTransfer.files, node.id);
    } else {
      const draggedId = e.dataTransfer.getData(INTERNAL_DRAG_MIME) || e.dataTransfer.getData("text/plain");
      if (draggedId) ctx.onMoveNode(draggedId, node.id);
    }
    ctx.setDropTargetId(null);
    ctx.setDraggingId(null);
  }

  return (
    <div>
      <div
        draggable={!renaming}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "group flex items-center gap-1 rounded-md px-1.5 py-1 text-sm hover:bg-accent",
          isActive && "bg-accent font-medium",
          isDragging && "opacity-40",
          isDropTarget && "bg-primary/10 outline-dashed outline-1 outline-primary"
        )}
        style={{ paddingLeft: depth * 14 + 6, ...depthGuideStyle(depth) }}
      >
        {ctx.selectMode && (
          <Checkbox
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={() => ctx.toggleSelected(node.id)}
            className="mr-0.5 shrink-0"
          />
        )}
        {isFolder ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex size-4 shrink-0 items-center justify-center"
          >
            <ChevronRightIcon
              className={cn("size-3.5 transition-transform", expanded && "rotate-90")}
            />
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}
        {isFolder ? (
          <FolderIcon className="size-4" style={{ color: depthGuideColor(depth) }} />
        ) : (
          fileIcon(node)
        )}
        {renaming ? (
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setRenaming(false);
            }}
            className="h-6 flex-1 px-1 text-sm"
          />
        ) : (
          <button
            className="min-w-0 flex-1 truncate text-left"
            onClick={() =>
              ctx.selectMode
                ? ctx.toggleSelected(node.id)
                : isFolder
                  ? setExpanded((v) => !v)
                  : openFile(node.id)
            }
            title={node.name}
          >
            {node.name}
          </button>
        )}
        {node.isMain && <StarIcon className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
              >
                <MoreHorizontalIcon className="size-3.5" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {isFolder && (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    setExpanded(true);
                    ctx.onCreateEntry("file", node.id);
                  }}
                >
                  <FilePlusIcon className="size-3.5" />
                  New file...
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setExpanded(true);
                    ctx.onCreateEntry("folder", node.id);
                  }}
                >
                  <FolderPlusIcon className="size-3.5" />
                  New folder...
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => setRenaming(true)}>Rename</DropdownMenuItem>
            {!isFolder && (
              <DropdownMenuItem onClick={() => duplicateFileNode(node.id)}>
                Duplicate
              </DropdownMenuItem>
            )}
            {!isFolder && node.name.endsWith(".tex") && !node.isMain && (
              <DropdownMenuItem onClick={() => setMainFileNode(node.id)}>
                Set as main file
              </DropdownMenuItem>
            )}
            {isFolder &&
              (() => {
                const texChildren = node.children.filter(
                  (c) => c.type === "file" && c.name.endsWith(".tex")
                );
                if (texChildren.length === 0) return null;
                return (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Set main file for this folder</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {texChildren.map((c) => (
                        <DropdownMenuItem
                          key={c.id}
                          onClick={() => setFolderMainFileNode(node.id, c.id)}
                        >
                          {node.folderMainFileId === c.id && <StarIcon className="size-3.5 fill-amber-400 text-amber-400" />}
                          {c.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                );
              })()}
            {!isFolder && (
              <DropdownMenuItem onClick={() => ctx.onDownloadNode(node.id)}>
                <DownloadIcon className="size-3.5" />
                Download
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => ctx.onDeleteNode(node.id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isFolder && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
