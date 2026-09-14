"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { diffLines } from "@/components/history/diff-lines";
import { getVersionDiff } from "@/lib/mock-api/history";

interface VersionDiffViewProps {
  versionAId: string;
  versionBId: string;
}

export function VersionDiffView({ versionAId, versionBId }: VersionDiffViewProps) {
  const [diff, setDiff] = useState<Array<{ path: string; aContent: string; bContent: string }> | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDiff(null);
      const result = await getVersionDiff(versionAId, versionBId);
      if (!cancelled) setDiff(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [versionAId, versionBId]);

  if (!diff) {
    return (
      <div className="p-3">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="flex max-h-[32rem] flex-col divide-y overflow-auto">
      {diff.map((file) => {
        const lines = diffLines(file.aContent, file.bContent);
        const changed = lines.some((l) => l.type !== "same");
        return (
          <div key={file.path} className="p-2.5">
            <p className="mb-1.5 flex items-center gap-2 font-mono text-xs font-medium">
              {file.path}
              {!changed && <span className="font-sans text-muted-foreground">(unchanged)</span>}
            </p>
            <div className="overflow-x-auto rounded-md bg-muted/30 font-mono text-xs">
              {lines.map((l, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "px-2 py-0.5 whitespace-pre",
                    l.type === "added" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                    l.type === "removed" && "bg-red-500/15 text-red-700 dark:text-red-400"
                  )}
                >
                  {l.type === "added" ? "+ " : l.type === "removed" ? "- " : "  "}
                  {l.text || " "}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
