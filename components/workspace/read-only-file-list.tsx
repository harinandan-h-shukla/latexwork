"use client";

import { FileIcon, FileTextIcon, FolderIcon, StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectFile } from "@/lib/types";

function fileIcon(file: ProjectFile) {
  if (file.type === "folder") return <FolderIcon className="size-4 text-muted-foreground" />;
  if (file.isBinary) return <FileIcon className="size-4 text-muted-foreground" />;
  if (file.name.endsWith(".tex")) return <FileTextIcon className="size-4 text-primary" />;
  return <FileIcon className="size-4 text-muted-foreground" />;
}

/**
 * A plain, non-interactive listing of a project's files for the web's
 * view-only workspace — no click-to-open, no create/delete/move/upload.
 * Real editing happens only in the desktop app (see
 * components/file-tree/file-tree.tsx for the full mutating tree that the
 * desktop editor still uses via EditorWorkspace/ManuscriptNav).
 *
 * Flat, depth-indented by path segment count rather than a real recursive
 * tree — sufficient for "see what's in this project," not meant to replace
 * the real navigable tree.
 */
export function ReadOnlyFileList({ files }: { files: ProjectFile[] }) {
  const sorted = [...files].sort((a, b) =>
    a.type !== b.type ? (a.type === "folder" ? -1 : 1) : a.path.localeCompare(b.path)
  );

  if (sorted.length === 0) {
    return <p className="px-3 py-4 text-sm text-muted-foreground">No files in this project yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-0.5 overflow-auto p-2">
      {sorted.map((file) => {
        const depth = Math.max(0, file.path.split("/").filter(Boolean).length - 1);
        return (
          <li
            key={file.id}
            className={cn("flex items-center gap-1.5 truncate rounded px-1.5 py-1 text-sm text-foreground")}
            style={{ paddingLeft: `${6 + depth * 14}px` }}
            title={file.path}
          >
            {fileIcon(file)}
            <span className="truncate">{file.name}</span>
            {file.isMain && <StarIcon className="size-3 shrink-0 fill-amber-400 text-amber-400" />}
          </li>
        );
      })}
    </ul>
  );
}
