"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CloudIcon, HardDriveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  connectCloudProvider,
  disconnectCloudProvider,
  listCloudConnections,
  type CloudProvider,
} from "@/lib/mock-api/export";

const PROVIDERS: Array<{ id: CloudProvider; label: string; icon: typeof CloudIcon }> = [
  { id: "dropbox", label: "Dropbox", icon: CloudIcon },
  { id: "google-drive", label: "Google Drive", icon: HardDriveIcon },
];

export function CloudConnectPanel({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<CloudProvider[]>([]);
  const [busy, setBusy] = useState<CloudProvider | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCloudConnections(projectId).then((rows) => {
      if (!cancelled) {
        setConnected(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function toggle(provider: CloudProvider) {
    setBusy(provider);
    try {
      if (connected.includes(provider)) {
        await disconnectCloudProvider(projectId, provider);
        setConnected((prev) => prev.filter((p) => p !== provider));
        toast.success(`Disconnected ${label(provider)}`);
      } else {
        await connectCloudProvider(projectId, provider);
        setConnected((prev) => [...prev, provider]);
        toast.success(`Connected ${label(provider)}`);
      }
    } finally {
      setBusy(null);
    }
  }

  function label(provider: CloudProvider) {
    return PROVIDERS.find((p) => p.id === provider)?.label ?? provider;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cloud storage sync</CardTitle>
        <CardDescription>Keep a mirrored copy of this project in Dropbox or Google Drive.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="flex flex-col gap-2">
            {PROVIDERS.map(({ id, label: providerLabel, icon: Icon }) => {
              const isConnected = connected.includes(id);
              return (
                <div key={id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                  <div className="flex items-center gap-2 text-sm">
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="font-medium">{providerLabel}</span>
                    {isConnected && (
                      <Badge variant="outline" className="text-[10px]">
                        connected
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={isConnected ? "ghost" : "outline"}
                    disabled={busy === id}
                    onClick={() => toggle(id)}
                  >
                    {isConnected ? "Disconnect" : "Connect"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
