"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookMarkedIcon, LibraryIcon, TableIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BibEditor } from "@/components/references/bib-editor";
import { CitationImportDialog } from "@/components/references/citation-import-dialog";
import { BibStylePreview } from "@/components/references/bib-style-preview";
import { DuplicateKeyPanel } from "@/components/references/duplicate-key-panel";
import { BrokenReferencePanel } from "@/components/references/broken-reference-panel";
import { ReferenceLibrary } from "@/components/references/reference-library";
import { PaperHealthCard } from "@/components/references/paper-health-card";
import {
  detectBrokenReferences,
  detectDuplicateKeys,
  getReferencesFile,
  listBibEntries,
  type BrokenReferences,
} from "@/lib/mock-api/references";
import type { BibEntry, ProjectFile } from "@/lib/types";
import { useIsDesktopApp } from "@/lib/runtime/use-is-desktop-app";

interface ReferencesWorkspaceProps {
  projectId: string;
}

export function ReferencesWorkspace({ projectId }: ReferencesWorkspaceProps) {
  const searchParams = useSearchParams();
  const highlightKey = searchParams.get("highlight");

  const [file, setFile] = useState<ProjectFile | null>(null);
  const [entries, setEntries] = useState<BibEntry[]>([]);
  const [duplicateKeys, setDuplicateKeys] = useState<string[]>([]);
  const [broken, setBroken] = useState<BrokenReferences>({ undefinedCites: [], unusedEntries: [] });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"library" | "raw">("library");
  const isDesktop = useIsDesktopApp();

  const refresh = useCallback(async (fileId: string) => {
    const [entryList, dupes, brokenRefs] = await Promise.all([
      listBibEntries(fileId),
      detectDuplicateKeys(fileId),
      detectBrokenReferences(projectId),
    ]);
    setEntries(entryList);
    setDuplicateKeys(dupes);
    setBroken(brokenRefs);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const refFile = await getReferencesFile(projectId);
      if (cancelled) return;
      setFile(refFile);
      await refresh(refFile.id);
      if (cancelled) return;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, refresh]);

  if (loading || !file) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <BookMarkedIcon className="size-4.5" style={{ color: "var(--icon-reference)" }} />
            Reference library
          </h2>
          <p className="text-sm text-muted-foreground">
            {entries.length} entr{entries.length === 1 ? "y" : "ies"} · {file.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isDesktop && (
            <Tabs value={view} onValueChange={(v) => setView(v as "library" | "raw")}>
              <TabsList>
                <TabsTrigger value="library" className="gap-1.5">
                  <LibraryIcon className="size-3.5" />
                  Library
                </TabsTrigger>
                <TabsTrigger value="raw" className="gap-1.5">
                  <TableIcon className="size-3.5" />
                  Raw .bib
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <BibStylePreview entries={entries} />
          {isDesktop && (
            <CitationImportDialog
              fileId={file.id}
              existingKeys={entries.map((e) => e.key)}
              onImported={() => refresh(file.id)}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {view === "library" || !isDesktop ? (
            <ReferenceLibrary
              projectId={projectId}
              entries={entries}
              highlightKey={highlightKey}
              onEdit={isDesktop ? () => setView("raw") : undefined}
            />
          ) : (
            <BibEditor fileId={file.id} entries={entries} onChange={() => refresh(file.id)} />
          )}
        </div>
        <div className="flex flex-col gap-4">
          <PaperHealthCard projectId={projectId} />
          <DuplicateKeyPanel
            entries={entries}
            duplicateKeys={duplicateKeys}
            onChanged={() => refresh(file.id)}
            readOnly={!isDesktop}
          />
          <BrokenReferencePanel
            fileId={file.id}
            undefinedCites={broken.undefinedCites}
            unusedEntries={broken.unusedEntries}
            onCreated={() => refresh(file.id)}
            readOnly={!isDesktop}
          />
        </div>
      </div>
    </div>
  );
}
