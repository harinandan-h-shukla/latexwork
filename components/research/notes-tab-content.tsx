"use client";

import { useEffect, useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { addNote, listNotes, listSavedPapers } from "@/lib/mock-api/research";
import type { ResearchNote, SavedPaper } from "@/lib/types";

export function NotesTabContent({ projectId }: { projectId: string }) {
  const [notes, setNotes] = useState<ResearchNote[] | null>(null);
  const [papers, setPapers] = useState<SavedPaper[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = () => listNotes(projectId, undefined).then(setNotes);
  useEffect(() => {
    refresh();
    listSavedPapers(projectId).then(setPapers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleAdd() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await addNote(projectId, { paperId: null, heading: "Note", body: draft.trim() });
      setDraft("");
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!notes) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }

  const paperTitle = (id: string | null) => papers.find((p) => p.id === id)?.title;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-xl border border-border p-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Capture a thought before it's gone…"
          className="min-h-20 resize-none border-none shadow-none focus-visible:ring-0"
        />
        <Button size="sm" className="gap-1.5 self-end" disabled={saving || !draft.trim()} onClick={handleAdd}>
          <PlusIcon className="size-3.5" />
          Add note
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{notes.length} notes</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {notes.map((note) => (
          <div key={note.id} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
            <p className="text-sm font-medium text-foreground">{note.heading}</p>
            <p className="text-sm text-muted-foreground">{note.body}</p>
            {note.paperId && paperTitle(note.paperId) && (
              <Badge variant="outline" className="mt-1 w-fit truncate text-[10px]">
                {paperTitle(note.paperId)}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
