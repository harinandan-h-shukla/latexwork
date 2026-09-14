"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/collaboration/user-avatar";
import {
  acceptAllByUser,
  acceptAllChanges,
  acceptChange,
  listTrackedChanges,
  rejectAllByUser,
  rejectAllChanges,
  rejectChange,
} from "@/lib/mock-api/collaboration";
import { mockDb } from "@/lib/mock-api/db";
import type { TrackedChange, User } from "@/lib/types";

export function TrackChangesTab({ projectId }: { projectId: string }) {
  const [changes, setChanges] = useState<TrackedChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState<string>("all");
  const [reviewMode, setReviewMode] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const list = await listTrackedChanges(projectId);
    setChanges(list);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, [refresh]);

  const authors = useMemo(() => {
    const ids = Array.from(new Set(changes.map((c) => c.authorId)));
    return ids
      .map((authorId) => mockDb.users.find((u) => u.id === authorId))
      .filter((u): u is User => Boolean(u));
  }, [changes]);

  const visible = userFilter === "all" ? changes : changes.filter((c) => c.authorId === userFilter);
  const pendingVisible = visible.filter((c) => c.status === "pending");

  async function handleAccept(changeId: string) {
    setBusy(true);
    try {
      await acceptChange(changeId);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(changeId: string) {
    setBusy(true);
    try {
      await rejectChange(changeId);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleBulk(action: "accept" | "reject") {
    setBusy(true);
    try {
      if (userFilter === "all") {
        await (action === "accept" ? acceptAllChanges(projectId) : rejectAllChanges(projectId));
      } else {
        await (action === "accept"
          ? acceptAllByUser(projectId, userFilter)
          : rejectAllByUser(projectId, userFilter));
      }
      toast.success(action === "accept" ? "Accepted all pending changes" : "Rejected all pending changes");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-2 border-b p-3">
        <label className="flex items-center justify-between text-xs">
          <span className="font-medium">Review mode</span>
          <Switch checked={reviewMode} onCheckedChange={setReviewMode} />
        </label>
        <Select value={userFilter} onValueChange={(v) => v && setUserFilter(v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All authors</SelectItem>
            {authors.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
            disabled={busy || pendingVisible.length === 0}
            onClick={() => handleBulk("accept")}
          >
            <CheckIcon className="size-3.5" /> Accept all
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
            disabled={busy || pendingVisible.length === 0}
            onClick={() => handleBulk("reject")}
          >
            <XIcon className="size-3.5" /> Reject all
          </Button>
        </div>
      </div>

      {!reviewMode ? (
        <p className="p-3 text-sm text-muted-foreground">
          Review mode is off — turn it on to inspect and act on tracked changes.
        </p>
      ) : visible.length === 0 ? (
        <p className="p-3 text-sm text-muted-foreground">No tracked changes yet.</p>
      ) : (
        <ul className="flex flex-1 flex-col gap-2 overflow-auto p-3">
          {visible.map((c) => {
            const author = mockDb.users.find((u) => u.id === c.authorId);
            return (
              <li key={c.id} className="rounded-lg border p-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  {author && <UserAvatar user={author} size="sm" />}
                  <span className="text-xs font-medium">{author?.name ?? "Unknown"}</span>
                  <Badge variant={c.type === "insertion" ? "default" : "destructive"} className="text-[10px]">
                    {c.type === "insertion" ? "+ addition" : "− deletion"}
                  </Badge>
                  {c.status !== "pending" && (
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {c.status}
                    </Badge>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-1.5 rounded bg-muted/40 px-1.5 py-1 font-mono text-xs",
                    c.type === "insertion"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 line-through dark:text-red-400"
                  )}
                >
                  {c.text}
                </p>
                {c.status === "pending" && (
                  <div className="mt-2 flex justify-end gap-1.5">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleReject(c.id)}
                      disabled={busy}
                      title="Reject"
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleAccept(c.id)}
                      disabled={busy}
                      title="Accept"
                    >
                      <CheckIcon className="size-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
