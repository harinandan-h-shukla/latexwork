"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheckIcon, ExternalLinkIcon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getReferencesFile, getCitationUsage, listBibEntries, type CitationUsage } from "@/lib/mock-api/references";
import type { BibEntry } from "@/lib/types";

interface ReferenceDetailPanelProps {
  projectId: string;
  citeKey: string;
}

export function ReferenceDetailPanel({ projectId, citeKey }: ReferenceDetailPanelProps) {
  const router = useRouter();
  const [entry, setEntry] = useState<BibEntry | null | undefined>(undefined);
  const [usage, setUsage] = useState<CitationUsage | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const file = await getReferencesFile(projectId);
      const [entries, usageMap] = await Promise.all([
        listBibEntries(file.id),
        getCitationUsage(projectId),
      ]);
      if (cancelled) return;
      setEntry(entries.find((e) => e.key === citeKey) ?? null);
      setUsage(usageMap[citeKey] ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, citeKey]);

  if (entry === undefined) {
    return (
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (entry === null) {
    return (
      <div className="flex flex-col gap-2 p-4 text-sm">
        <p className="font-medium text-foreground">No entry for &ldquo;{citeKey}&rdquo;</p>
        <p className="text-muted-foreground">
          This citation key isn&apos;t defined in references.bib yet. Open References to add it.
        </p>
      </div>
    );
  }

  const venue = entry.fields.journal ?? entry.fields.booktitle ?? entry.fields.publisher ?? entry.type;

  return (
    <div className="flex flex-col gap-3 p-3">
      <div>
        <p className="text-sm leading-snug font-semibold text-foreground">
          {entry.fields.title ?? entry.key}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {entry.fields.author ?? "Unknown author"}
          {venue ? ` · ${venue}` : ""}
          {entry.fields.year ? ` ${entry.fields.year}` : ""}
        </p>
      </div>

      <div className="flex flex-col gap-1 text-xs">
        <span className={entry.metadataVerified ? "flex items-center gap-1.5 text-success" : "flex items-center gap-1.5 text-muted-foreground"}>
          <BadgeCheckIcon className="size-3.5" />
          {entry.metadataVerified ? "Metadata verified" : "Metadata incomplete"}
        </span>
        <span className={entry.doiVerified ? "flex items-center gap-1.5 text-success" : "flex items-center gap-1.5 text-muted-foreground"}>
          <BadgeCheckIcon className="size-3.5" />
          {entry.doiVerified ? "DOI verified" : "No DOI on file"}
        </span>
      </div>

      {usage && usage.count > 0 ? (
        <div className="rounded-lg border border-border bg-muted/30 p-2.5">
          <p className="text-xs font-medium text-foreground">
            Cited {usage.count} time{usage.count === 1 ? "" : "s"}
          </p>
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {usage.sections.map((section) => (
              <li key={section} className="text-xs text-muted-foreground">
                {section} × {usage.count > 1 ? Math.max(1, Math.round(usage.count / usage.sections.length)) : 1}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Not cited anywhere else in this manuscript yet.</p>
      )}

      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5"
          onClick={() =>
            entry.fields.doi
              ? toast.info(`Would open doi.org/${entry.fields.doi} — demo data, no live paper.`)
              : toast.info("No DOI on file for this reference.")
          }
        >
          <ExternalLinkIcon className="size-3.5" />
          Open paper
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5"
          onClick={() => router.push(`/projects/${projectId}/references?highlight=${entry.key}`)}
        >
          <PencilIcon className="size-3.5" />
          Edit
        </Button>
      </div>
    </div>
  );
}
