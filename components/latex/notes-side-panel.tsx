"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLinkIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { addNote, listNotes } from "@/lib/mock-api/research";
import type { ResearchNote } from "@/lib/types";

export function NotesSidePanel({ projectId }: { projectId: string }) {
  const [notes, setNotes] = useState<ResearchNote[] | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listNotes(projectId, null).then(setNotes);
  }, [projectId]);

  async function handleAdd() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const note = await addNote(projectId, { paperId: null, heading: "Note", body: draft.trim() });
      setNotes((prev) => [note, ...(prev ?? [])]);
      setDraft("");
    } finally {
      setSaving(false);
    }
  }

  if (!notes) {
    return (
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex flex-col gap-1.5 rounded-md border border-border p-1.5">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Quick research note…"
          className="min-h-16 resize-none border-none p-1 text-xs shadow-none focus-visible:ring-0"
        />
        <Button size="sm" className="gap-1 self-end" disabled={saving || !draft.trim()} onClick={handleAdd}>
          <PlusIcon className="size-3.5" />
          Add
        </Button>
      </div>

      <Link
        href={`/projects/${projectId}/research?tab=notes`}
        className="flex items-center justify-between rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {notes.length} note{notes.length === 1 ? "" : "s"}
        <ExternalLinkIcon className="size-3" />
      </Link>
      <div className="flex flex-col gap-1">
        {notes.slice(0, 10).map((note) => (
          <div key={note.id} className="rounded-md px-1.5 py-1.5 hover:bg-muted">
            <p className="text-xs font-medium text-foreground">{note.heading}</p>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{note.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
