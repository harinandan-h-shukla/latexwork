"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownToLineIcon, ArrowUpFromLineIcon, GitBranchIcon, UnlinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  connectGitRepo,
  disconnectGitRepo,
  getGitConnection,
  syncGit,
} from "@/lib/mock-api/export";

export function GitSyncPanel({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getGitConnection(projectId).then((connection) => {
      if (cancelled) return;
      setRepoUrl(connection?.repoUrl ?? null);
      setLastSyncedAt(connection?.lastSyncedAt ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function handleConnect() {
    if (!input.trim()) {
      toast.error("Enter a repository URL");
      return;
    }
    setBusy(true);
    try {
      await connectGitRepo(projectId, input.trim());
      setRepoUrl(input.trim());
      setInput("");
      toast.success("Repository connected");
    } finally {
      setBusy(false);
    }
  }

  async function handleSync(direction: "push" | "pull") {
    setBusy(true);
    try {
      const { syncedAt } = await syncGit(projectId, direction);
      setLastSyncedAt(syncedAt);
      toast.success(direction === "push" ? "Pushed local changes to the repository" : "Pulled latest changes from the repository");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    try {
      await disconnectGitRepo(projectId);
      setRepoUrl(null);
      setLastSyncedAt(null);
      toast.success("Repository disconnected");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Git sync</CardTitle>
        <CardDescription>Two-way sync with a GitHub or GitLab repository — not paywalled here.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-full" />
        ) : repoUrl ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
              <GitBranchIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-mono">{repoUrl}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}` : "Not synced yet"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleSync("push")} disabled={busy}>
                <ArrowUpFromLineIcon className="size-3.5" /> Push
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleSync("pull")} disabled={busy}>
                <ArrowDownToLineIcon className="size-3.5" /> Pull
              </Button>
              <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={handleDisconnect} disabled={busy}>
                <UnlinkIcon className="size-3.5" /> Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="git@github.com:you/paper.git"
              className="flex-1"
            />
            <Button onClick={handleConnect} disabled={busy} className="shrink-0">
              Connect repository
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
