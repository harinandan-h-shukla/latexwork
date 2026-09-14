"use client";

import { useMemo, useState } from "react";
import { FolderIcon, HomeIcon } from "lucide-react";
import type { ProjectFile } from "@/lib/types";
import { buildTree, collectDescendantIds, type TreeNode } from "@/components/file-tree/file-tree-utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MoveToDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: ProjectFile[];
  excludeIds: Set<string>;
  onConfirm: (targetFolderId: string | null) => void;
}

function FolderOption({
  node,
  depth,
  disabledIds,
  selected,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  disabledIds: Set<string>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const disabled = disabledIds.has(node.id);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(node.id)}
        style={{ paddingLeft: depth * 16 + 8 }}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40",
          selected === node.id && "bg-accent font-medium"
        )}
      >
        <FolderIcon className="size-4 shrink-0 text-amber-500" />
        <span className="truncate">{node.name}</span>
      </button>
      {node.children
        .filter((c) => c.type === "folder")
        .map((child) => (
          <FolderOption
            key={child.id}
            node={child}
            depth={depth + 1}
            disabledIds={disabledIds}
            selected={selected}
            onSelect={onSelect}
          />
        ))}
    </>
  );
}

export function MoveToDialog({ open, onOpenChange, files, excludeIds, onConfirm }: MoveToDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const tree = useMemo(() => buildTree(files).filter((n) => n.type === "folder"), [files]);

  const disabledIds = useMemo(() => {
    const ids = new Set<string>();
    for (const id of excludeIds) {
      for (const d of collectDescendantIds(files, id)) ids.add(d);
    }
    return ids;
  }, [files, excludeIds]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelected(null);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to…</DialogTitle>
        </DialogHeader>
        <div className="max-h-72 overflow-auto rounded-md border p-1">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className={cn(
              "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
              selected === null && "bg-accent font-medium"
            )}
          >
            <HomeIcon className="size-4 shrink-0 text-muted-foreground" />
            Project root
          </button>
          {tree.map((node) => (
            <FolderOption
              key={node.id}
              node={node}
              depth={1}
              disabledIds={disabledIds}
              selected={selected}
              onSelect={setSelected}
            />
          ))}
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              onConfirm(selected);
              setSelected(null);
              onOpenChange(false);
            }}
          >
            Move here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
