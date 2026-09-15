"use client";

import { useEffect, useState } from "react";
import { CheckCircle2Icon, MessageCircleIcon, UserCheckIcon } from "lucide-react";
import { CommentsPanel } from "@/components/collaboration/comments-panel";
import { CURRENT_USER_ID } from "@/lib/mock-api/db";
import { listComments, listTrackedChanges } from "@/lib/mock-api/collaboration";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useIsDesktopApp } from "@/lib/runtime/use-is-desktop-app";

interface ReviewStatus {
  total: number;
  unresolved: number;
  resolved: number;
  assignedToYou: number;
  pendingChanges: number;
}

function StatTile({ label, value, icon: Icon }: { label: string; value: number; icon: typeof CheckCircle2Icon }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function ReviewWorkspace({ projectId }: { projectId: string }) {
  const loadProject = useWorkspaceStore((s) => s.loadProject);
  const [status, setStatus] = useState<ReviewStatus | null>(null);
  const isDesktop = useIsDesktopApp();

  useEffect(() => {
    if (useWorkspaceStore.getState().projectId !== projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  useEffect(() => {
    (async () => {
      const [comments, changes] = await Promise.all([listComments(projectId), listTrackedChanges(projectId)]);
      const unresolved = comments.filter((c) => !c.resolved).length;
      setStatus({
        total: comments.length,
        unresolved,
        resolved: comments.length - unresolved,
        assignedToYou: comments.filter((c) => !c.resolved && c.mentions.includes(CURRENT_USER_ID)).length,
        pendingChanges: changes.filter((c) => c.status === "pending").length,
      });
    })();
  }, [projectId]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">Review</h2>
        <p className="text-sm text-muted-foreground">
          Where comments, suggested edits, and open discussion live before this manuscript ships.
        </p>
      </div>

      {status && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Comments" value={status.total} icon={MessageCircleIcon} />
          <StatTile label="Unresolved" value={status.unresolved} icon={MessageCircleIcon} />
          <StatTile label="Resolved" value={status.resolved} icon={CheckCircle2Icon} />
          <StatTile label="Assigned to you" value={status.assignedToYou} icon={UserCheckIcon} />
        </div>
      )}

      <div className="h-[560px] overflow-hidden rounded-xl border border-border">
        <CommentsPanel projectId={projectId} readOnly={!isDesktop} />
      </div>
    </div>
  );
}
