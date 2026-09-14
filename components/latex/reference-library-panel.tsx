"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLinkIcon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getReferencesFile, listBibEntries, getCitationUsage, type CitationUsage } from "@/lib/mock-api/references";
import type { BibEntry } from "@/lib/types";

/**
 * Condensed reference-library view for the always-visible References rail
 * icon (distinct from ReferenceDetailPanel, which takes over when the
 * cursor is inside a \cite{} — see SidePanelHost). Same lightweight
 * fetch-and-list pattern as PapersSidePanel/NotesSidePanel, deep-linking to
 * the full References tab rather than duplicating the raw .bib editor here.
 */
export function ReferenceLibraryPanel({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<BibEntry[] | null>(null);
  const [usage, setUsage] = useState<Record<string, CitationUsage>>({});
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const file = await getReferencesFile(projectId);
      const [list, usageMap] = await Promise.all([listBibEntries(file.id), getCitationUsage(projectId)]);
      if (cancelled) return;
      setEntries(list);
      setUsage(usageMap);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.key.toLowerCase().includes(q) ||
        (e.fields.title ?? "").toLowerCase().includes(q) ||
        (e.fields.author ?? "").toLowerCase().includes(q)
    );
  }, [entries, query]);

  if (!entries) {
    return (
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="relative">
        <SearchIcon className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search references…"
          className="h-8 pl-7 text-xs"
        />
      </div>

      <Link
        href={`/projects/${projectId}/references`}
        className="flex items-center justify-between rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {entries.length} reference{entries.length === 1 ? "" : "s"}
        <ExternalLinkIcon className="size-3" />
      </Link>

      <div className="flex flex-col gap-1">
        {filtered.slice(0, 20).map((entry) => {
          const count = usage[entry.key]?.count ?? 0;
          return (
            <div key={entry.id} className="rounded-md px-1.5 py-1.5 hover:bg-muted">
              <p className="line-clamp-2 text-xs leading-snug font-medium text-foreground">
                {entry.fields.title ?? entry.key}
              </p>
              <p className="mt-0.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="truncate">{entry.fields.author ?? entry.type}</span>
                <span className="shrink-0">Cited {count}×</span>
              </p>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-1.5 py-2 text-xs text-muted-foreground">No references match &ldquo;{query}&rdquo;.</p>
        )}
      </div>
    </div>
  );
}
