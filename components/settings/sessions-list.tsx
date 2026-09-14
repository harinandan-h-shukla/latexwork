"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LaptopIcon, MonitorSmartphoneIcon, ShieldOffIcon, SmartphoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listSessions, revokeSession } from "@/lib/mock-api/security";
import type { SessionInfo } from "@/lib/types";

function deviceIcon(device: string) {
  if (/iphone|android|phone/i.test(device)) return SmartphoneIcon;
  if (/ipad|tablet/i.test(device)) return MonitorSmartphoneIcon;
  return LaptopIcon;
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SessionsList() {
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function refresh() {
    setSessions(await listSessions());
  }

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, []);

  async function handleRevoke(session: SessionInfo) {
    setRevokingId(session.id);
    try {
      await revokeSession(session.id);
      toast.success(`Signed out on ${session.device}`);
      await refresh();
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active sessions</CardTitle>
        <CardDescription>Devices currently signed in to your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {!sessions ? (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : (
          sessions.map((session) => {
            const Icon = deviceIcon(session.device);
            return (
              <div
                key={session.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <Icon className="size-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {session.device}
                      {session.isCurrent && (
                        <Badge variant="secondary" className="text-[10px]">
                          This device
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.browser} on {session.os} · {session.location} · active {formatRelative(session.lastActiveAt)}
                    </p>
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={revokingId === session.id}
                    onClick={() => handleRevoke(session)}
                  >
                    <ShieldOffIcon className="size-3.5" />
                    Revoke
                  </Button>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
