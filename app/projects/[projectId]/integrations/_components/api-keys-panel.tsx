"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CopyIcon, KeyIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { generateApiKey, listApiKeys, revokeApiKey } from "@/lib/mock-api/export";
import type { ApiKey } from "@/lib/types";

export function ApiKeysPanel({ projectId }: { projectId: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const rows = await listApiKeys(projectId);
    setKeys(rows);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, [refresh]);

  async function handleGenerate() {
    if (!label.trim()) {
      toast.error("Give this key a label");
      return;
    }
    setGenerating(true);
    try {
      const key = await generateApiKey(label.trim());
      setNewKey(key.fullKey);
      setLabel("");
      await refresh();
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    await revokeApiKey(keyId);
    toast.success("API key revoked");
    await refresh();
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("API key copied to clipboard");
    } catch {
      toast.error("Couldn't copy — copy it manually");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setNewKey(null);
      setLabel("");
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>API keys</CardTitle>
          <CardDescription>Programmatic access to project/file operations via the REST API.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
            <PlusIcon className="size-3.5" /> Generate key
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{newKey ? "New API key" : "Generate an API key"}</DialogTitle>
              <DialogDescription>
                {newKey
                  ? "Copy this key now — you won't be able to see it again."
                  : "Give the key a label so you can recognize it later."}
              </DialogDescription>
            </DialogHeader>
            {newKey ? (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
                <KeyIcon className="size-4 shrink-0 text-muted-foreground" />
                <code className="flex-1 truncate text-xs">{newKey}</code>
                <Button variant="ghost" size="icon-sm" onClick={() => handleCopy(newKey)}>
                  <CopyIcon className="size-3.5" />
                </Button>
              </div>
            ) : (
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. CI pipeline" />
            )}
            <DialogFooter>
              {newKey ? (
                <Button onClick={() => handleOpenChange(false)}>Done</Button>
              ) : (
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? "Generating…" : "Generate"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.label}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{k.keyPrefix}…</TableCell>
                  <TableCell>
                    <Badge variant={k.revoked ? "outline" : "default"} className="text-[10px]">
                      {k.revoked ? "revoked" : "active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={k.revoked}
                      onClick={() => handleRevoke(k.id)}
                    >
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
