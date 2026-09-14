"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BadgeCheckIcon, CopyIcon, ExternalLinkIcon, MoreHorizontalIcon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCitationUsage, type CitationUsage } from "@/lib/mock-api/references";
import type { BibEntry } from "@/lib/types";

type FilterKey = "all" | "cited" | "uncited" | "needs-review";

interface ReferenceLibraryProps {
  projectId: string;
  entries: BibEntry[];
  highlightKey?: string | null;
  onEdit: (entry: BibEntry) => void;
}

export function ReferenceLibrary({ projectId, entries, highlightKey, onEdit }: ReferenceLibraryProps) {
  const [usage, setUsage] = useState<Record<string, CitationUsage>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    getCitationUsage(projectId).then(setUsage);
  }, [projectId, entries.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      const cited = (usage[e.key]?.count ?? 0) > 0;
      const needsReview = !e.metadataVerified || e.isDuplicateKey;
      if (filter === "cited" && !cited) return false;
      if (filter === "uncited" && cited) return false;
      if (filter === "needs-review" && !needsReview) return false;
      if (!q) return true;
      return (
        e.key.toLowerCase().includes(q) ||
        (e.fields.title ?? "").toLowerCase().includes(q) ||
        (e.fields.author ?? "").toLowerCase().includes(q)
      );
    });
  }, [entries, usage, filter, query]);

  const counts = useMemo(
    () => ({
      all: entries.length,
      cited: entries.filter((e) => (usage[e.key]?.count ?? 0) > 0).length,
      uncited: entries.filter((e) => (usage[e.key]?.count ?? 0) === 0).length,
      needsReview: entries.filter((e) => !e.metadataVerified || e.isDuplicateKey).length,
    }),
    [entries, usage],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, author, DOI…"
          className="pl-8"
        />
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="cited">Cited ({counts.cited})</TabsTrigger>
          <TabsTrigger value="uncited">Uncited ({counts.uncited})</TabsTrigger>
          <TabsTrigger value="needs-review">Needs review ({counts.needsReview})</TabsTrigger>
        </TabsList>
      </Tabs>

      {entries.length === 0 ? (
        <Skeleton className="h-24 w-full" />
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No references match.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((entry) => {
            const entryUsage = usage[entry.key];
            const venue = entry.fields.journal ?? entry.fields.booktitle ?? entry.fields.publisher;
            return (
              <div
                key={entry.id}
                id={`ref-${entry.key}`}
                className={
                  "flex flex-col gap-2 rounded-xl border p-3 transition-colors " +
                  (highlightKey === entry.key
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card")
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {entry.fields.title ?? entry.key}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {entry.fields.author ?? "Unknown author"}
                      {venue ? ` · ${venue}` : ""}
                      {entry.fields.year ? ` ${entry.fields.year}` : ""}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                      <MoreHorizontalIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          navigator.clipboard?.writeText(`\\cite{${entry.key}}`).catch(() => {});
                          toast.success(`Copied \\cite{${entry.key}}`);
                        }}
                      >
                        <CopyIcon />
                        Copy \cite{"{}"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          entry.fields.doi
                            ? toast.info(`Would open doi.org/${entry.fields.doi} — demo data.`)
                            : toast.info("No DOI on file.")
                        }
                      >
                        <ExternalLinkIcon />
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(entry)}>Edit entry</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {entry.metadataVerified && (
                    <Badge variant="secondary" className="gap-1 text-[11px]">
                      <BadgeCheckIcon className="size-3" /> Metadata verified
                    </Badge>
                  )}
                  {entry.doiVerified && (
                    <Badge variant="secondary" className="gap-1 text-[11px]">
                      <BadgeCheckIcon className="size-3" /> DOI verified
                    </Badge>
                  )}
                  {entry.isDuplicateKey && (
                    <Badge variant="destructive" className="text-[11px]">
                      Duplicate key
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[11px]">
                    Cited {entryUsage?.count ?? 0} time{(entryUsage?.count ?? 0) === 1 ? "" : "s"}
                  </Badge>
                  {entryUsage?.sections.map((s) => (
                    <Badge key={s} variant="outline" className="text-[11px] text-muted-foreground">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
