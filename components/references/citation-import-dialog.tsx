"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DownloadIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createBibEntry,
  importFromDoi,
  importMendeleyLibrary,
  importZoteroLibrary,
  searchCrossRef,
  type CrossRefResult,
  type LibraryItem,
} from "@/lib/mock-api/references";
import { generateCitationKey } from "@/lib/bibtex";
import type { BibEntry } from "@/lib/types";

interface CitationImportDialogProps {
  fileId: string;
  existingKeys: string[];
  onImported: () => void;
}

export function CitationImportDialog({ fileId, existingKeys, onImported }: CitationImportDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <DownloadIcon /> Import citations
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import citations</DialogTitle>
          <DialogDescription>
            Pull references in from a DOI, a literature search, or a connected reference
            manager. Imported entries are added straight to your bibliography.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="doi">
          <TabsList className="w-full">
            <TabsTrigger value="doi">DOI</TabsTrigger>
            <TabsTrigger value="crossref">CrossRef / PubMed</TabsTrigger>
            <TabsTrigger value="zotero">Zotero</TabsTrigger>
            <TabsTrigger value="mendeley">Mendeley</TabsTrigger>
          </TabsList>

          <TabsContent value="doi" className="mt-4">
            <DoiImportTab fileId={fileId} onImported={onImported} />
          </TabsContent>
          <TabsContent value="crossref" className="mt-4">
            <CrossRefImportTab fileId={fileId} existingKeys={existingKeys} onImported={onImported} />
          </TabsContent>
          <TabsContent value="zotero" className="mt-4">
            <LibraryImportTab
              fileId={fileId}
              existingKeys={existingKeys}
              onImported={onImported}
              providerLabel="Zotero"
              fetchLibrary={importZoteroLibrary}
            />
          </TabsContent>
          <TabsContent value="mendeley" className="mt-4">
            <LibraryImportTab
              fileId={fileId}
              existingKeys={existingKeys}
              onImported={onImported}
              providerLabel="Mendeley"
              fetchLibrary={importMendeleyLibrary}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function DoiImportTab({ fileId, onImported }: { fileId: string; onImported: () => void }) {
  const [doi, setDoi] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BibEntry | null>(null);

  async function handleLookup() {
    if (!doi.trim()) {
      toast.error("Enter a DOI first");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const entry = await importFromDoi(doi.trim(), fileId);
      setResult(entry);
      toast.success(`Imported "${entry.key}" from DOI`);
      onImported();
    } catch {
      toast.error("Could not resolve that DOI");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={doi}
          onChange={(e) => setDoi(e.target.value)}
          placeholder="10.1000/xyz123"
          disabled={loading}
        />
        <Button onClick={handleLookup} disabled={loading} className="shrink-0">
          {loading ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
          Look up &amp; import
        </Button>
      </div>
      {result && (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="font-medium">{result.fields.title}</p>
          <p className="text-muted-foreground">
            {result.fields.author} · {result.fields.year} · key: {result.key}
          </p>
        </div>
      )}
    </div>
  );
}

function CrossRefImportTab({
  fileId,
  existingKeys,
  onImported,
}: {
  fileId: string;
  existingKeys: string[];
  onImported: () => void;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CrossRefResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  async function handleSearch() {
    setLoading(true);
    try {
      const found = await searchCrossRef(query);
      setResults(found);
      setSelected(new Set());
    } catch {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  }

  function toggle(doi: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(doi)) next.delete(doi);
      else next.add(doi);
      return next;
    });
  }

  async function handleImportSelected() {
    const chosen = results.filter((r) => selected.has(r.doi));
    if (chosen.length === 0) {
      toast.error("Select at least one result");
      return;
    }
    setImporting(true);
    try {
      const keysInUse = [...existingKeys];
      for (const item of chosen) {
        const key = generateCitationKey(item.authors, item.year, keysInUse);
        keysInUse.push(key);
        await createBibEntry(fileId, {
          key,
          type: "article",
          fields: { author: item.authors, title: item.title, year: item.year, doi: item.doi },
        });
      }
      toast.success(`Imported ${chosen.length} citation${chosen.length > 1 ? "s" : ""}`);
      setSelected(new Set());
      onImported();
    } catch {
      toast.error("Could not import the selected citations");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search CrossRef / PubMed by title or topic…"
          disabled={loading}
        />
        <Button onClick={handleSearch} disabled={loading} className="shrink-0">
          {loading ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
          Search
        </Button>
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {results.map((r) => (
              <li key={r.doi} className="flex items-start gap-2 rounded-lg border p-2.5 text-sm">
                <Checkbox
                  id={`xref-${r.doi}`}
                  checked={selected.has(r.doi)}
                  onCheckedChange={() => toggle(r.doi)}
                  className="mt-0.5"
                />
                <Label htmlFor={`xref-${r.doi}`} className="flex-1 cursor-pointer flex-col items-start gap-0.5 font-normal">
                  <span className="font-medium">{r.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.authors} · {r.year} · {r.doi}
                  </span>
                </Label>
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            className="self-end"
            disabled={importing || selected.size === 0}
            onClick={handleImportSelected}
          >
            {importing ? "Importing…" : `Import selected (${selected.size})`}
          </Button>
        </div>
      )}
    </div>
  );
}

function LibraryImportTab({
  fileId,
  existingKeys,
  onImported,
  providerLabel,
  fetchLibrary,
}: {
  fileId: string;
  existingKeys: string[];
  onImported: () => void;
  providerLabel: string;
  fetchLibrary: () => Promise<LibraryItem[]>;
}) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  async function handleConnect() {
    setConnecting(true);
    try {
      const library = await fetchLibrary();
      setItems(library);
      setConnected(true);
      toast.success(`Connected to ${providerLabel}`);
    } catch {
      toast.error(`Could not connect to ${providerLabel}`);
    } finally {
      setConnecting(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleImportSelected() {
    const chosen = items.filter((i) => selected.has(i.id));
    if (chosen.length === 0) {
      toast.error("Select at least one item");
      return;
    }
    setImporting(true);
    try {
      const keysInUse = [...existingKeys];
      for (const item of chosen) {
        const key = generateCitationKey(item.authors, item.year, keysInUse);
        keysInUse.push(key);
        await createBibEntry(fileId, {
          key,
          type: "misc",
          fields: { author: item.authors, title: item.title, year: item.year },
        });
      }
      toast.success(`Imported ${chosen.length} item${chosen.length > 1 ? "s" : ""} from ${providerLabel}`);
      setSelected(new Set());
      onImported();
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Connect your {providerLabel} account to browse and import your library.
        </p>
        <Button onClick={handleConnect} disabled={connecting}>
          {connecting ? "Connecting…" : `Connect ${providerLabel} account`}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 rounded-lg border p-2.5 text-sm">
            <Checkbox
              id={`${providerLabel}-${item.id}`}
              checked={selected.has(item.id)}
              onCheckedChange={() => toggle(item.id)}
              className="mt-0.5"
            />
            <Label
              htmlFor={`${providerLabel}-${item.id}`}
              className="flex-1 cursor-pointer flex-col items-start gap-0.5 font-normal"
            >
              <span className="font-medium">{item.title}</span>
              <span className="text-xs text-muted-foreground">
                {item.authors} · {item.year}
              </span>
            </Label>
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        className="self-end"
        disabled={importing || selected.size === 0}
        onClick={handleImportSelected}
      >
        {importing ? "Importing…" : `Import selected (${selected.size})`}
      </Button>
    </div>
  );
}
