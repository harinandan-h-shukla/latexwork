"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  BookMarkedIcon,
  CircleCheckIcon,
  CircleIcon,
  NotebookPenIcon,
  PlusIcon,
  ScaleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  addOpenQuestion,
  listEvidenceClaims,
  listOpenQuestions,
  listSavedPapers,
  markPaperReviewed,
  savePaper,
  toggleOpenQuestion,
} from "@/lib/mock-api/research";
import type { EvidenceClaim, OpenQuestion, SavedPaper } from "@/lib/types";
import { NotesTabContent } from "@/components/research/notes-tab-content";

const STATUS_LABEL: Record<EvidenceClaim["status"], string> = {
  supported: "Supported",
  "needs-more-evidence": "Needs more evidence",
  contested: "Contested",
};

const STATUS_TONE: Record<EvidenceClaim["status"], string> = {
  supported: "text-success",
  "needs-more-evidence": "text-warning",
  contested: "text-destructive",
};

function PapersTab({ projectId }: { projectId: string }) {
  const [papers, setPapers] = useState<SavedPaper[] | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [venue, setVenue] = useState("");
  const [year, setYear] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = () => listSavedPapers(projectId).then(setPapers);
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleSave() {
    if (!title.trim() || !authors.trim()) return;
    setSaving(true);
    try {
      await savePaper(projectId, { title: title.trim(), authors: authors.trim(), venue: venue.trim() || "Unpublished", year: year.trim() || "—" });
      toast.success("Paper saved");
      setSaveOpen(false);
      setTitle("");
      setAuthors("");
      setVenue("");
      setYear("");
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!papers) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{papers.length} saved papers</p>
        <Button size="sm" className="gap-1.5" onClick={() => setSaveOpen(true)}>
          <PlusIcon className="size-3.5" />
          Save a paper
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {papers.map((paper) => (
          <div key={paper.id} className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm leading-snug font-medium text-foreground">{paper.title}</p>
              {paper.needsReview && (
                <Badge variant="outline" className="shrink-0 text-[10px] text-warning">
                  Needs review
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {paper.authors} · {paper.venue} {paper.year}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {paper.bibKey && (
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {paper.bibKey}
                </Badge>
              )}
              {paper.tags.map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
            {paper.needsReview && (
              <Button
                size="xs"
                variant="outline"
                className="mt-1 w-fit"
                onClick={async () => {
                  await markPaperReviewed(paper.id);
                  await refresh();
                }}
              >
                Mark reviewed
              </Button>
            )}
          </div>
        ))}
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save a paper</DialogTitle>
            <DialogDescription>Add it to this project&apos;s research library.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Authors</Label>
              <Input value={authors} onChange={(e) => setAuthors(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Venue</Label>
                <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="NeurIPS" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Year</Label>
                <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2025" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving || !title.trim() || !authors.trim()} onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuestionsTab({ projectId }: { projectId: string }) {
  const [questions, setQuestions] = useState<OpenQuestion[] | null>(null);
  const [papers, setPapers] = useState<SavedPaper[]>([]);
  const [draft, setDraft] = useState("");

  const refresh = () => listOpenQuestions(projectId).then(setQuestions);
  useEffect(() => {
    refresh();
    listSavedPapers(projectId).then(setPapers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleAdd() {
    if (!draft.trim()) return;
    await addOpenQuestion(projectId, draft.trim());
    setDraft("");
    await refresh();
  }

  if (!questions) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }

  const paperTitle = (id: string | null) => papers.find((p) => p.id === id)?.title;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What don't we know yet?"
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleAdd();
          }}
        />
        <Button onClick={handleAdd} disabled={!draft.trim()}>
          Add
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {questions.map((q) => (
          <button
            key={q.id}
            onClick={async () => {
              await toggleOpenQuestion(q.id);
              await refresh();
            }}
            className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-left hover:bg-accent"
          >
            {q.resolved ? (
              <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <p className={q.resolved ? "text-sm text-muted-foreground line-through" : "text-sm text-foreground"}>
                {q.text}
              </p>
              {(q.linkedPaperId || q.linkedSection) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {q.linkedSection ? `${q.linkedSection}` : ""}
                  {q.linkedPaperId && paperTitle(q.linkedPaperId) ? ` · ${paperTitle(q.linkedPaperId)}` : ""}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function EvidenceTab({ projectId }: { projectId: string }) {
  const [claims, setClaims] = useState<EvidenceClaim[] | null>(null);
  const [papers, setPapers] = useState<SavedPaper[]>([]);

  useEffect(() => {
    listEvidenceClaims(projectId).then(setClaims);
    listSavedPapers(projectId).then(setPapers);
  }, [projectId]);

  if (!claims) return <Skeleton className="h-40 w-full rounded-xl" />;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        A working map from claims to supporting literature and your own evidence — not an
        AI-verified fact-check, just a structured place to track what still needs backing.
      </p>
      {claims.map((claim) => (
        <div key={claim.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
          <p className="flex items-start gap-2 text-sm font-medium text-foreground">
            <ScaleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            &ldquo;{claim.claim}&rdquo;
          </p>
          <div className="pl-6 text-xs text-muted-foreground">
            <p>
              Supporting papers:{" "}
              {claim.supportingPaperIds
                .map((id) => papers.find((p) => p.id === id)?.title)
                .filter(Boolean)
                .join(", ") || "none yet"}
            </p>
            <p>Our evidence: {claim.ownEvidence.join(", ") || "none yet"}</p>
          </div>
          <Badge variant="outline" className={"w-fit pl-6 " + STATUS_TONE[claim.status]}>
            {STATUS_LABEL[claim.status]}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export function ResearchWorkspace({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "papers";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">Research</h2>
        <p className="text-sm text-muted-foreground">
          Papers you&apos;ve saved, notes you&apos;ve taken, and open questions still to answer.
        </p>
      </div>
      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="papers" className="gap-1.5">
            <BookMarkedIcon className="size-3.5" />
            Papers
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5">
            <NotebookPenIcon className="size-3.5" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-1.5">
            <CircleIcon className="size-3.5" />
            Open questions
          </TabsTrigger>
          <TabsTrigger value="evidence" className="gap-1.5">
            <ScaleIcon className="size-3.5" />
            Evidence
          </TabsTrigger>
        </TabsList>
        <TabsContent value="papers">
          <PapersTab projectId={projectId} />
        </TabsContent>
        <TabsContent value="notes">
          <NotesTabContent projectId={projectId} />
        </TabsContent>
        <TabsContent value="questions">
          <QuestionsTab projectId={projectId} />
        </TabsContent>
        <TabsContent value="evidence">
          <EvidenceTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
