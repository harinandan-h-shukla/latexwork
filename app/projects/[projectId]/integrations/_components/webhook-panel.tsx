"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PlusIcon, TrashIcon, WebhookIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createWebhook, deleteWebhook, listWebhooks } from "@/lib/mock-api/export";
import type { Webhook } from "@/lib/types";

const EVENT_OPTIONS: Array<{ id: Webhook["events"][number]; label: string }> = [
  { id: "compile.completed", label: "Compile completed" },
  { id: "project.updated", label: "Project updated" },
];

export function WebhookPanel({ projectId }: { projectId: string }) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<Set<Webhook["events"][number]>>(new Set(["compile.completed"]));
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    const rows = await listWebhooks(projectId);
    setWebhooks(rows);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, [refresh]);

  function toggleEvent(eventId: Webhook["events"][number]) {
    setEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }

  async function handleCreate() {
    if (!url.trim()) {
      toast.error("Enter a webhook URL");
      return;
    }
    if (events.size === 0) {
      toast.error("Select at least one event");
      return;
    }
    setCreating(true);
    try {
      await createWebhook(projectId, url.trim(), Array.from(events));
      toast.success("Webhook added");
      setUrl("");
      await refresh();
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(webhookId: string) {
    await deleteWebhook(webhookId);
    toast.success("Webhook removed");
    await refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhooks</CardTitle>
        <CardDescription>Notify an external URL on compile complete or project updates.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-service.example.com/webhooks/inkwell"
          />
          <div className="flex flex-wrap gap-4">
            {EVENT_OPTIONS.map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={events.has(opt.id)} onCheckedChange={() => toggleEvent(opt.id)} />
                <Label className="font-normal">{opt.label}</Label>
              </label>
            ))}
          </div>
          <Button size="sm" className="w-fit gap-1.5" onClick={handleCreate} disabled={creating}>
            <PlusIcon className="size-3.5" /> Add webhook
          </Button>
        </div>

        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : webhooks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No webhooks configured yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {webhooks.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <WebhookIcon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs">{w.url}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {w.events.map((e) => (
                        <Badge key={e} variant="outline" className="text-[10px]">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(w.id)} title="Delete webhook">
                  <TrashIcon className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
