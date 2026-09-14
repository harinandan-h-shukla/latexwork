"use client";

import { UploadIcon } from "lucide-react";
import type { UploadEntry } from "@/components/file-tree/use-file-uploads";
import { formatBytes } from "@/components/file-tree/file-tree-utils";
import { Progress } from "@/components/ui/progress";

export function UploadQueue({ uploads }: { uploads: UploadEntry[] }) {
  if (uploads.length === 0) return null;
  return (
    <div className="border-t bg-muted/40 p-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <UploadIcon className="size-3.5" />
        Uploading {uploads.length} file{uploads.length > 1 ? "s" : ""}…
      </div>
      <div className="flex max-h-32 flex-col gap-1.5 overflow-auto">
        {uploads.map((u) => (
          <div key={u.id} className="text-xs">
            <div className="mb-0.5 flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1 truncate" title={u.name}>
                {u.name}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {u.done ? formatBytes(u.sizeBytes) : `${u.progress}%`}
              </span>
            </div>
            <Progress value={u.progress} />
          </div>
        ))}
      </div>
    </div>
  );
}
