"use client";

import type { ProjectFile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { extensionOf, formatBytes, thumbnailColorsFor } from "@/components/file-tree/file-tree-utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

function ThumbnailSwatch({ file, size }: { file: ProjectFile; size: "sm" | "lg" }) {
  const [from, to] = thumbnailColorsFor(file.name);
  const ext = extensionOf(file.name).toUpperCase();
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[3px] font-semibold text-white shadow-sm",
        size === "sm" ? "size-4 text-[6px]" : "size-32 rounded-lg text-lg"
      )}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {ext || "IMG"}
    </div>
  );
}

export function FileThumbnail({ file }: { file: ProjectFile }) {
  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <span className="inline-flex shrink-0">
            <ThumbnailSwatch file={file} size="sm" />
          </span>
        }
      />
      <HoverCardContent side="right" className="w-auto p-3">
        <div className="flex flex-col items-center gap-2">
          <ThumbnailSwatch file={file} size="lg" />
          <div className="text-center text-xs">
            <div className="max-w-[10rem] truncate font-medium" title={file.name}>
              {file.name}
            </div>
            <div className="text-muted-foreground">{formatBytes(file.sizeBytes)}</div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
