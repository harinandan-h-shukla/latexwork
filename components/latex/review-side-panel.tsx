"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getPaperHealth, type PaperHealth } from "@/lib/mock-api/references";
import { listComments, listTrackedChanges } from "@/lib/mock-api/collaboration";

/** Condensed Paper Health + unresolved comments/changes for the Review rail
 * icon — a quick-glance status, not a replacement for the full Review tab
 * (which keeps the actual accept/reject/reply actions). */
export function ReviewSidePanel({ projectId }: { projectId: string }) {
  const [health, setHealth] = useState<PaperHealth | null>(null);
  const [unresolvedComments, setUnresolvedComments] = useState<number | null>(null);
  const [pendingChanges, setPendingChanges] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [h, comments, changes] = await Promise.all([
        getPaperHealth(projectId),
        listComments(projectId),
        listTrackedChanges(projectId),
      ]);
      if (cancelled) return;
      setHealth(h);
      setUnresolvedComments(comments.filter((c) => !c.resolved).length);
      setPendingChanges(changes.filter((c) => c.status === "pending").length);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (!health || unresolvedComments == null || pendingChanges == null) {
    return (
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  const scoreColor = health.score >= 80 ? "text-success" : health.score >= 50 ? "text-warning" : "text-error";

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-3 rounded-md border border-border p-2.5">
        <span className={cn("text-2xl font-semibold tabular-nums", scoreColor)}>{health.score}%</span>
        <div className="text-xs text-muted-foreground">
          <p>
            {health.citationsResolved}/{health.citationsTotal} citations resolved
          </p>
          <p>
            {health.figuresReferenced}/{health.figuresTotal} figures referenced
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center justify-between rounded-md px-1.5 py-1">
          <span className="text-muted-foreground">Unresolved comments</span>
          <span className={cn("font-medium tabular-nums", unresolvedComments > 0 && "text-warning")}>
            {unresolvedComments}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-md px-1.5 py-1">
          <span className="text-muted-foreground">Pending tracked changes</span>
          <span className={cn("font-medium tabular-nums", pendingChanges > 0 && "text-warning")}>
            {pendingChanges}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-md px-1.5 py-1">
          <span className="text-muted-foreground">Unused references</span>
          <span className={cn("font-medium tabular-nums", health.unusedReferenceCount > 0 && "text-warning")}>
            {health.unusedReferenceCount}
          </span>
        </div>
      </div>

      <Link
        href={`/projects/${projectId}/review`}
        className="flex items-center justify-between rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        Open full review
        <ExternalLinkIcon className="size-3" />
      </Link>
    </div>
  );
}
