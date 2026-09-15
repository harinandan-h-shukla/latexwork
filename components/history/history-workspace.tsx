"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DownloadIcon, HistoryIcon, RotateCcwIcon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/collaboration/user-avatar";
import { formatRelativeTime } from "@/components/collaboration/collab-utils";
import { SaveVersionDialog } from "@/components/history/save-version-dialog";
import { VersionDiffView } from "@/components/history/version-diff-view";
import { listVersions, restoreVersion } from "@/lib/mock-api/history";
import { mockDb } from "@/lib/mock-api/db";
import { useIsDesktopApp } from "@/lib/runtime/use-is-desktop-app";
import type { User, Version } from "@/lib/types";

export function HistoryWorkspace({ projectId }: { projectId: string }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState<string>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const isDesktop = useIsDesktopApp();

  const refresh = useCallback(async () => {
    const list = await listVersions(projectId);
    setVersions(list);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, [refresh]);

  const authors = useMemo(() => {
    const ids = Array.from(new Set(versions.map((v) => v.authorId)));
    return ids
      .map((authorId) => mockDb.users.find((u) => u.id === authorId))
      .filter((u): u is User => Boolean(u));
  }, [versions]);

  const visible = userFilter === "all" ? versions : versions.filter((v) => v.authorId === userFilter);

  function toggleSelect(versionId: string) {
    setSelected((prev) => {
      if (prev.includes(versionId)) return prev.filter((v) => v !== versionId);
      if (prev.length >= 2) return [prev[1], versionId];
      return [...prev, versionId];
    });
  }

  async function handleRestore(version: Version) {
    await restoreVersion(version.id);
    toast.success(
      `Restored "${version.label ?? formatRelativeTime(version.createdAt)}" — project reverted to this version.`
    );
  }

  function handleDownload(version: Version) {
    const file = version.fileSnapshots[0];
    if (!file) {
      toast.error("Nothing to download for this version");
      return;
    }
    const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.path.replace(/^\//, "") || "version.tex";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${a.download}`);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const [aId, bId] = selected;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">Version history</h2>
          <p className="text-sm text-muted-foreground">
            {versions.length} version{versions.length === 1 ? "" : "s"} · select two to compare
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={userFilter} onValueChange={(v) => v && setUserFilter(v)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All collaborators</SelectItem>
              {authors.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isDesktop && <SaveVersionDialog projectId={projectId} onSaved={refresh} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ul className="flex flex-col gap-2">
          {visible.map((v) => {
            const author = mockDb.users.find((u) => u.id === v.authorId);
            const isSelected = selected.includes(v.id);
            return (
              <li
                key={v.id}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border p-3",
                  isSelected && "border-primary ring-1 ring-primary/30"
                )}
              >
                <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(v.id)} className="mt-1" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{v.label ?? "Auto-snapshot"}</span>
                    {v.isAutoSnapshot ? (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <HistoryIcon className="size-3" /> auto
                      </Badge>
                    ) : (
                      <Badge className="text-[10px]">manual</Badge>
                    )}
                  </div>
                  {v.message && <p className="mt-0.5 text-sm text-muted-foreground">{v.message}</p>}
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {author && <UserAvatar user={author} size="sm" />}
                    <span>
                      {author?.name ?? "Unknown"} · {formatRelativeTime(v.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon-sm" title="Download this version" onClick={() => handleDownload(v)}>
                    <DownloadIcon className="size-3.5" />
                  </Button>
                  {isDesktop && (
                    <Button variant="ghost" size="icon-sm" title="Restore this version" onClick={() => handleRestore(v)}>
                      <RotateCcwIcon className="size-3.5" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="rounded-lg border">
          {aId && bId ? (
            <VersionDiffView versionAId={aId} versionBId={bId} />
          ) : (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-1 p-6 text-center text-sm text-muted-foreground">
              <SaveIcon className="mb-1 size-5" />
              Select two versions to see a line-by-line diff.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
