"use client";

import { useEffect, useMemo, useState } from "react";
import { FileTextIcon, MessageSquareIcon, NotebookPenIcon, QuoteIcon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useWorkspaceStore } from "@/store/workspace-store";
import { getReferencesFile, listBibEntries } from "@/lib/mock-api/references";
import { listComments } from "@/lib/mock-api/collaboration";
import { listNotes } from "@/lib/mock-api/research";
import { jumpToFileLine } from "@/components/latex/jump-helpers";
import type { BibEntry, Comment, ResearchNote } from "@/lib/types";

type ResultKind = "file" | "reference" | "comment" | "note";

interface SearchResult {
  kind: ResultKind;
  id: string;
  title: string;
  subtitle: string;
  onSelect: () => void;
}

/** Cross-content search: manuscript (open-file text + all file names),
 * references, comments, notes. Filters data already fetched by other panels
 * rather than issuing a fresh request per keystroke — a debounce wouldn't
 * help here since there's no network round trip to save, only a client-side
 * array scan over each dataset once it's loaded. */
export function SearchSidePanel({ projectId }: { projectId: string }) {
  const files = useWorkspaceStore((s) => s.files);
  const fileContents = useWorkspaceStore((s) => s.fileContents);
  const openFile = useWorkspaceStore((s) => s.openFile);

  const [query, setQuery] = useState("");
  const [bibEntries, setBibEntries] = useState<BibEntry[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notes, setNotes] = useState<ResearchNote[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [file, commentList, noteList] = await Promise.all([
        getReferencesFile(projectId),
        listComments(projectId),
        listNotes(projectId, null),
      ]);
      const entries = await listBibEntries(file.id);
      if (cancelled) return;
      setBibEntries(entries);
      setComments(commentList);
      setNotes(noteList);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: SearchResult[] = [];

    for (const f of files) {
      if (f.type !== "file") continue;
      const nameMatch = f.name.toLowerCase().includes(q);
      const content = fileContents[f.id];
      const contentMatch = content?.toLowerCase().includes(q) ?? false;
      if (nameMatch || contentMatch) {
        out.push({
          kind: "file",
          id: f.id,
          title: f.name,
          subtitle: contentMatch ? "Matches in file content" : "Matches filename",
          onSelect: () => openFile(f.id),
        });
      }
    }

    for (const e of bibEntries) {
      const hay = `${e.key} ${e.fields.title ?? ""} ${e.fields.author ?? ""}`.toLowerCase();
      if (hay.includes(q)) {
        out.push({
          kind: "reference",
          id: e.id,
          title: e.fields.title ?? e.key,
          subtitle: e.fields.author ?? e.key,
          onSelect: () => {},
        });
      }
    }

    for (const c of comments) {
      if (c.text.toLowerCase().includes(q)) {
        out.push({
          kind: "comment",
          id: c.id,
          title: c.text,
          subtitle: c.resolved ? "Resolved" : "Open",
          onSelect: () => jumpToFileLine(c.fileId, 1),
        });
      }
    }

    for (const n of notes) {
      const hay = `${n.heading} ${n.body}`.toLowerCase();
      if (hay.includes(q)) {
        out.push({ kind: "note", id: n.id, title: n.heading, subtitle: n.body, onSelect: () => {} });
      }
    }

    return out.slice(0, 40);
  }, [query, files, fileContents, bibEntries, comments, notes, openFile]);

  const icons: Record<ResultKind, typeof FileTextIcon> = {
    file: FileTextIcon,
    reference: QuoteIcon,
    comment: MessageSquareIcon,
    note: NotebookPenIcon,
  };

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="relative">
        <SearchIcon className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search manuscript, references, comments, notes…"
          className="h-8 pl-7 text-xs"
        />
      </div>

      {query.trim().length >= 2 && results.length === 0 && (
        <p className="px-1.5 py-2 text-xs text-muted-foreground">No matches for &ldquo;{query}&rdquo;.</p>
      )}

      <div className="flex flex-col gap-1">
        {results.map((r) => {
          const Icon = icons[r.kind];
          return (
            <button
              key={`${r.kind}-${r.id}`}
              onClick={r.onSelect}
              className="flex items-start gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-muted"
            >
              <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="line-clamp-1 block text-xs font-medium text-foreground">{r.title}</span>
                <span className="line-clamp-1 block text-[11px] text-muted-foreground">{r.subtitle}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
