"use client";

import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace-store";

export function EditorTabs() {
  const files = useWorkspaceStore((s) => s.files);
  const openFileIds = useWorkspaceStore((s) => s.openFileIds);
  const activeFileId = useWorkspaceStore((s) => s.activeFileId);
  const dirtyFileIds = useWorkspaceStore((s) => s.dirtyFileIds);
  const setActiveFile = useWorkspaceStore((s) => s.setActiveFile);
  const closeFile = useWorkspaceStore((s) => s.closeFile);
  const saveFileContent = useWorkspaceStore((s) => s.saveFileContent);

  if (openFileIds.length === 0) return null;

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto border-b bg-muted/30 px-1">
      {openFileIds.map((fileId) => {
        const file = files.find((f) => f.id === fileId);
        if (!file) return null;
        const isActive = activeFileId === fileId;
        const isDirty = dirtyFileIds.has(fileId);
        return (
          <button
            key={fileId}
            onClick={() => setActiveFile(fileId)}
            className={cn(
              "group flex shrink-0 items-center gap-1.5 border-t-2 border-t-transparent px-2.5 py-1.5 text-xs",
              isActive
                ? "border-t-primary bg-background text-foreground"
                : "text-muted-foreground hover:bg-accent/60"
            )}
          >
            <span className="max-w-40 truncate">{file.name}</span>
            {isDirty && <span className="size-1.5 rounded-full bg-foreground/60" />}
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                if (isDirty) saveFileContent(fileId);
                closeFile(fileId);
              }}
              className="rounded-sm p-0.5 opacity-0 hover:bg-accent group-hover:opacity-100"
            >
              <XIcon className="size-3" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
