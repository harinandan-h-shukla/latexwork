"use client";

import { useEffect, useState } from "react";
import { AlertTriangleIcon, CheckCircle2Icon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getPaperHealth, type PaperHealth } from "@/lib/mock-api/references";

function scoreTone(score: number): string {
  if (score >= 85) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
}

export function PaperHealthCard({ projectId }: { projectId: string }) {
  const [health, setHealth] = useState<PaperHealth | null>(null);

  useEffect(() => {
    getPaperHealth(projectId).then(setHealth);
  }, [projectId]);

  if (!health) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }

  const goodChecks = [
    `${health.citationsResolved}/${health.citationsTotal} citations resolved`,
    `${health.referenceCount} references`,
    `${health.metadataVerifiedCount}/${health.referenceCount} metadata verified`,
    health.figuresTotal > 0 ? `${health.figuresReferenced}/${health.figuresTotal} figures referenced` : null,
    health.tablesTotal > 0 ? `${health.tablesReferenced}/${health.tablesTotal} tables referenced` : null,
  ].filter((c): c is string => Boolean(c));

  const warnings = [
    health.unusedReferenceCount > 0 ? `${health.unusedReferenceCount} unused reference${health.unusedReferenceCount === 1 ? "" : "s"}` : null,
    health.incompleteMetadataCount > 0
      ? `${health.incompleteMetadataCount} incomplete metadata record${health.incompleteMetadataCount === 1 ? "" : "s"}`
      : null,
    health.citationsTotal - health.citationsResolved > 0
      ? `${health.citationsTotal - health.citationsResolved} unresolved citation${health.citationsTotal - health.citationsResolved === 1 ? "" : "s"}`
      : null,
  ].filter((w): w is string => Boolean(w));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Paper health</h3>
        <span className={cn("text-2xl font-semibold tabular-nums", scoreTone(health.score))}>
          {health.score}%
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {goodChecks.map((c) => (
          <div key={c} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2Icon className="size-3.5 shrink-0 text-success" />
            {c}
          </div>
        ))}
        {warnings.map((w) => (
          <div key={w} className="flex items-center gap-1.5 text-xs text-warning">
            <AlertTriangleIcon className="size-3.5 shrink-0" />
            {w}
          </div>
        ))}
      </div>
    </div>
  );
}
