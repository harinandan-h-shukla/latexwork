"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  CheckIcon,
  DownloadIcon,
  FileSearchIcon,
  LibraryIcon,
  SearchIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceStore } from "@/store/workspace-store";
import { getReferencesFile, listBibEntries, searchCrossRef, importFromDoi, type CrossRefResult } from "@/lib/mock-api/references";
import { findDuplicatePaper, savePaper } from "@/lib/mock-api/research";
import type { BibEntry } from "@/lib/types";

export function CitationPickerDialog() {
  const projectId = useWorkspaceStore((s) => s.projectId);
  const editorHandle = useWorkspaceStore((s) => s.editorHandle);
  const open = useWorkspaceStore((s) => s.citationPickerOpen);
  const onOpenChange = useWorkspaceStore((s) => s.setCitationPickerOpen);

  const [libraryQuery, setLibraryQuery] = useState("");
  const [entries, setEntries] = useState<BibEntry[] | null>(null);
  const [bibFileId, setBibFileId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CrossRefResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [importingDoi, setImportingDoi] = useState<string | null>(null);
  const [duplicateOf, setDuplicateOf] = useState<{ result: CrossRefResult; existingKey: string } | null>(null);

  useEffect(() => {
    if (!open || !projectId) return;
    (async () => {
      const file = await getReferencesFile(projectId);
      setBibFileId(file.id);
      setEntries(await listBibEntries(file.id));
    })();
  }, [open, projectId]);

  function insertCitation(key: string) {
    editorHandle?.insertAtCursor(`\\cite{${key}}`);
    onOpenChange(false);
    setDuplicateOf(null);
    toast.success(`Inserted \\cite{${key}}`);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      setSearchResults(await searchCrossRef(searchQuery.trim()));
    } finally {
      setSearching(false);
    }
  }

  async function handleCiteResult(result: CrossRefResult) {
    if (!projectId) return;
    // Duplicate detection: does a paper with this exact title already exist in this project's library?
    const existing = await findDuplicatePaper(projectId, result.title);
    if (existing?.bibKey) {
      setDuplicateOf({ result, existingKey: existing.bibKey });
      return;
    }
    await handleImportAndInsert(result);
  }

  async function handleImportAndInsert(result: CrossRefResult) {
    if (!projectId || !bibFileId) return;
    setImportingDoi(result.doi);
    try {
      const entry = await importFromDoi(result.doi, bibFileId);
      if (bibFileId) setEntries((prev) => [...(prev ?? []), entry]);
      await savePaper(projectId, {
        title: result.title,
        authors: result.authors,
        venue: "CrossRef",
        year: result.year,
        doi: result.doi,
      }).catch(() => undefined);
      insertCitation(entry.key);
    } finally {
      setImportingDoi(null);
    }
  }

  const filteredEntries = (entries ?? []).filter((e) => {
    const q = libraryQuery.trim().toLowerCase();
    if (!q) return true;
    return e.key.toLowerCase().includes(q) || (e.fields.title ?? "").toLowerCase().includes(q);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setDuplicateOf(null);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Insert citation</DialogTitle>
          <DialogDescription>Search your library or find a paper to cite.</DialogDescription>
        </DialogHeader>

        {duplicateOf ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-warning" />
              <div>
                <p className="font-medium text-foreground">This paper already exists.</p>
                <p className="mt-1 text-foreground">{duplicateOf.result.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Existing reference: <span className="font-mono">{duplicateOf.existingKey}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => insertCitation(duplicateOf.existingKey)}>
                Cite existing
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const result = duplicateOf.result;
                  setDuplicateOf(null);
                  void handleImportAndInsert(result);
                }}
              >
                Create separate record
              </Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="library">
            <TabsList className="w-full">
              <TabsTrigger value="library" className="flex-1 gap-1.5">
                <LibraryIcon className="size-3.5" />
                My library
              </TabsTrigger>
              <TabsTrigger value="search" className="flex-1 gap-1.5">
                <FileSearchIcon className="size-3.5" />
                Search papers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="flex flex-col gap-2">
              <Input
                autoFocus
                placeholder="Search by key, title, author…"
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
              />
              <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                {entries === null ? (
                  <>
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </>
                ) : filteredEntries.length === 0 ? (
                  <p className="p-3 text-center text-sm text-muted-foreground">
                    No matching references — try the Search papers tab.
                  </p>
                ) : (
                  filteredEntries.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => insertCitation(entry.key)}
                      className="flex flex-col items-start gap-0.5 rounded-lg border border-border px-3 py-2 text-left text-sm hover:border-border-strong hover:bg-accent"
                    >
                      <span className="font-medium">{entry.fields.title ?? entry.key}</span>
                      <span className="text-xs text-muted-foreground">
                        {entry.fields.author ?? "Unknown author"} · {entry.fields.year ?? "—"} ·{" "}
                        <span className="font-mono">{entry.key}</span>
                      </span>
                      {(entry.doiVerified || entry.metadataVerified) && (
                        <span className="mt-0.5 flex items-center gap-2 text-[11px]">
                          {entry.metadataVerified && (
                            <span className="flex items-center gap-1 text-success">
                              <BadgeCheckIcon className="size-3" /> Metadata verified
                            </span>
                          )}
                          {entry.doiVerified && (
                            <span className="flex items-center gap-1 text-success">
                              <BadgeCheckIcon className="size-3" /> DOI verified
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="search" className="flex flex-col gap-2">
              <div className="flex gap-1.5">
                <Input
                  placeholder="Search by title, author, keywords…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSearch();
                  }}
                />
                <Button size="icon" variant="outline" disabled={searching} onClick={handleSearch}>
                  <SearchIcon className="size-4" />
                </Button>
              </div>
              <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                {searching ? (
                  <>
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </>
                ) : searchResults.length === 0 ? (
                  <p className="p-3 text-center text-sm text-muted-foreground">
                    Search scholarly literature for a paper to cite. Example · demo data.
                  </p>
                ) : (
                  searchResults.map((result) => (
                    <div
                      key={result.doi}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{result.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {result.authors} · {result.year} · {result.doi}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1.5"
                        disabled={importingDoi === result.doi}
                        onClick={() => handleCiteResult(result)}
                      >
                        {importingDoi === result.doi ? (
                          <CheckIcon className="size-3.5" />
                        ) : (
                          <DownloadIcon className="size-3.5" />
                        )}
                        Cite
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
