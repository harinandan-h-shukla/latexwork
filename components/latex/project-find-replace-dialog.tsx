"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getFileContent } from "@/lib/mock-api";
import { useWorkspaceStore } from "@/store/workspace-store";
import { buildSearchRegExp, findMatchesInContent, replaceAllInContent, type FileMatch } from "@/components/latex/search-utils";
import { jumpToFileLine } from "@/components/latex/jump-helpers";
import type { ProjectFile } from "@/lib/types";

interface FileMatchGroup {
  file: ProjectFile;
  content: string;
  matches: FileMatch[];
}

export function ProjectFindReplaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const files = useWorkspaceStore((s) => s.files);
  const fileContents = useWorkspaceStore((s) => s.fileContents);
  const setFileContent = useWorkspaceStore((s) => s.setFileContent);
  const saveFileContent = useWorkspaceStore((s) => s.saveFileContent);

  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [regex, setRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [groups, setGroups] = useState<FileMatchGroup[]>([]);
  const [searched, setSearched] = useState(false);

  async function runSearch() {
    const searchRegex = buildSearchRegExp(query, { regex, caseSensitive, wholeWord });
    if (!searchRegex) {
      setGroups([]);
      setSearched(true);
      return;
    }
    setIsSearching(true);
    const textFiles = files.filter((f) => f.type === "file" && !f.isBinary);
    // Fetch every not-yet-open file's content in parallel instead of one
    // sequential await per file — on a multi-chapter project with dozens of
    // files not currently open in tabs, the sequential version turned a
    // single search into several seconds of serialized mock-API round trips.
    // Settled, not a bare Promise.all: getFileContent() now throws for a
    // file whose stored content can't be decrypted (see files.ts), and one
    // unreadable file must not silently kill search across the whole rest
    // of the project — it's excluded from results and flagged instead.
    const settled = await Promise.allSettled(
      textFiles.map((file) => Promise.resolve(fileContents[file.id] ?? getFileContent(file.id)))
    );
    const unreadable: string[] = [];
    const nextGroups: FileMatchGroup[] = [];
    textFiles.forEach((file, i) => {
      const outcome = settled[i];
      if (outcome.status === "rejected") {
        unreadable.push(file.name);
        return;
      }
      const content = outcome.value;
      const matches = findMatchesInContent(content, searchRegex);
      if (matches.length > 0) {
        nextGroups.push({ file, content, matches });
      }
    });
    if (unreadable.length > 0) {
      toast.error(`Couldn't read ${unreadable.length === 1 ? unreadable[0] : `${unreadable.length} files`} — skipped in this search.`);
    }
    setGroups(nextGroups);
    setSearched(true);
    setIsSearching(false);
  }

  async function replaceAllInFile(group: FileMatchGroup) {
    const searchRegex = buildSearchRegExp(query, { regex, caseSensitive, wholeWord });
    if (!searchRegex) return;
    const nextContent = replaceAllInContent(group.content, searchRegex, replacement);
    setFileContent(group.file.id, nextContent);
    await saveFileContent(group.file.id);
    toast.success(`Replaced ${group.matches.length} match${group.matches.length === 1 ? "" : "es"} in ${group.file.name}`);
    setGroups((prev) => prev.filter((g) => g.file.id !== group.file.id));
  }

  async function replaceAllInProject() {
    const searchRegex = buildSearchRegExp(query, { regex, caseSensitive, wholeWord });
    if (!searchRegex) return;
    // Each file save is independent — parallelize instead of serializing one
    // saveFileContent round trip after another across potentially dozens of
    // files.
    await Promise.all(
      groups.map((group) => {
        const nextContent = replaceAllInContent(group.content, searchRegex, replacement);
        setFileContent(group.file.id, nextContent);
        return saveFileContent(group.file.id);
      })
    );
    toast.success(`Replaced matches across ${groups.length} file${groups.length === 1 ? "" : "s"}`);
    setGroups([]);
  }

  const totalMatches = groups.reduce((sum, g) => sum + g.matches.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Find & replace in project</DialogTitle>
          <DialogDescription>Search across every file in this project.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              placeholder="Find"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              autoFocus
            />
          </div>
          <Input placeholder="Replace with" value={replacement} onChange={(e) => setReplacement(e.target.value)} />
          <div className="flex flex-wrap items-center gap-1.5">
            <Toggle size="sm" pressed={regex} onPressedChange={setRegex} aria-label="Regex">
              .*
            </Toggle>
            <Toggle size="sm" pressed={caseSensitive} onPressedChange={setCaseSensitive} aria-label="Case sensitive">
              Aa
            </Toggle>
            <Toggle size="sm" pressed={wholeWord} onPressedChange={setWholeWord} aria-label="Whole word">
              ab
            </Toggle>
            <Button size="sm" className="ml-auto" onClick={runSearch} disabled={isSearching || !query}>
              {isSearching ? "Searching…" : "Search"}
            </Button>
          </div>
        </div>

        {searched && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {totalMatches} match{totalMatches === 1 ? "" : "es"} in {groups.length} file{groups.length === 1 ? "" : "s"}
            </span>
            {groups.length > 0 && (
              <Button size="xs" variant="outline" onClick={replaceAllInProject}>
                Replace all in project
              </Button>
            )}
          </div>
        )}

        <ScrollArea className="h-72 rounded-md border">
          <div className="flex flex-col divide-y">
            {groups.map((group) => (
              <div key={group.file.id} className="p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium">{group.file.path}</span>
                  <Button size="xs" variant="ghost" onClick={() => replaceAllInFile(group)}>
                    Replace all ({group.matches.length})
                  </Button>
                </div>
                <div className="flex flex-col gap-0.5">
                  {group.matches.slice(0, 20).map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="truncate rounded px-1.5 py-0.5 text-left font-mono text-xs text-muted-foreground hover:bg-muted"
                      onClick={() => jumpToFileLine(group.file.id, m.line)}
                    >
                      <span className="mr-2 text-foreground/60">L{m.line}</span>
                      {m.preview}
                    </button>
                  ))}
                  {group.matches.length > 20 && (
                    <span className="px-1.5 text-xs text-muted-foreground">
                      +{group.matches.length - 20} more
                    </span>
                  )}
                </div>
              </div>
            ))}
            {searched && groups.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">No matches found.</div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
