"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleDotIcon, ExternalLinkIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { listSavedPapers } from "@/lib/mock-api/research";
import type { SavedPaper } from "@/lib/types";

export function PapersSidePanel({ projectId }: { projectId: string }) {
  const [papers, setPapers] = useState<SavedPaper[] | null>(null);

  useEffect(() => {
    listSavedPapers(projectId).then(setPapers);
  }, [projectId]);

  if (!papers) {
    return (
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      <Link
        href={`/projects/${projectId}/research`}
        className="mb-1 flex items-center justify-between rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {papers.length} saved paper{papers.length === 1 ? "" : "s"}
        <ExternalLinkIcon className="size-3" />
      </Link>
      {papers.slice(0, 12).map((paper) => (
        <div key={paper.id} className="rounded-md px-1.5 py-1.5 hover:bg-muted">
          <p className="flex items-start gap-1 text-xs leading-snug font-medium text-foreground">
            {paper.needsReview && (
              <CircleDotIcon className="mt-0.5 size-2.5 shrink-0 text-warning" />
            )}
            <span className="line-clamp-2">{paper.title}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {paper.authors} · {paper.year}
          </p>
        </div>
      ))}
    </div>
  );
}
