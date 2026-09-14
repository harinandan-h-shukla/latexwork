"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BookMarkedIcon,
  ImageIcon,
  MessageCircleIcon,
  NotebookPenIcon,
  PlugIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PaperHealthCard } from "@/components/references/paper-health-card";
import { listComments, listCollaborators } from "@/lib/mock-api/collaboration";
import { getReferencesFile, listBibEntries } from "@/lib/mock-api/references";
import { listOpenQuestions, listSavedPapers, listNotes } from "@/lib/mock-api/research";
import { useWorkspaceStore } from "@/store/workspace-store";

interface OverviewStats {
  referenceCount: number;
  paperCount: number;
  noteCount: number;
  figureCount: number;
  collaboratorCount: number;
  openQuestionCount: number;
  unresolvedComments: number;
}

function StatCard({ icon: Icon, label, value, href }: { icon: typeof BookMarkedIcon; label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3 transition-colors hover:border-border-strong hover:bg-accent"
    >
      <Icon className="size-4 text-muted-foreground" />
      <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Link>
  );
}

export function OverviewWorkspace({ projectId, projectName }: { projectId: string; projectName: string }) {
  const loadProject = useWorkspaceStore((s) => s.loadProject);
  const files = useWorkspaceStore((s) => s.files);
  const [stats, setStats] = useState<OverviewStats | null>(null);

  useEffect(() => {
    if (useWorkspaceStore.getState().projectId !== projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  useEffect(() => {
    (async () => {
      const [refFile, papers, notes, questions, comments, collaborators] = await Promise.all([
        getReferencesFile(projectId).catch(() => null),
        listSavedPapers(projectId),
        listNotes(projectId, undefined),
        listOpenQuestions(projectId),
        listComments(projectId),
        listCollaborators(projectId),
      ]);
      const entries = refFile ? await listBibEntries(refFile.id) : [];
      setStats({
        referenceCount: entries.length,
        paperCount: papers.length,
        noteCount: notes.length,
        figureCount: files.filter((f) => f.isBinary && (f.mimeType?.startsWith("image/") ?? false)).length,
        collaboratorCount: collaborators.length,
        openQuestionCount: questions.filter((q) => !q.resolved).length,
        unresolvedComments: comments.filter((c) => !c.resolved).length,
      });
    })();
  }, [projectId, files]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Continue where you left off</p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">{projectName}</h2>
        <Button className="mt-3 gap-1.5" nativeButton={false} render={<Link href={`/projects/${projectId}`} />}>
          Continue writing
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>

      {stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={BookMarkedIcon} label="References" value={stats.referenceCount} href={`/projects/${projectId}/references`} />
          <StatCard icon={BookMarkedIcon} label="Saved papers" value={stats.paperCount} href={`/projects/${projectId}/research`} />
          <StatCard icon={NotebookPenIcon} label="Notes" value={stats.noteCount} href={`/projects/${projectId}/research?tab=notes`} />
          <StatCard icon={ImageIcon} label="Figures" value={stats.figureCount} href={`/projects/${projectId}/figures`} />
          <StatCard icon={UsersIcon} label="Collaborators" value={stats.collaboratorCount} href={`/projects/${projectId}/review`} />
          <StatCard icon={MessageCircleIcon} label="Open questions" value={stats.openQuestionCount} href={`/projects/${projectId}/research?tab=questions`} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <PaperHealthCard projectId={projectId} />
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">More</h3>
          <Link
            href={`/projects/${projectId}/integrations`}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <PlugIcon className="size-4" />
            Git, cloud storage, API keys & webhooks
          </Link>
        </div>
      </div>
    </div>
  );
}
