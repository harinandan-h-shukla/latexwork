"use client";

import { useEffect, useState } from "react";
import {
  KeyRoundIcon,
  LinkIcon,
  LogInIcon,
  ShieldIcon,
  ShieldOffIcon,
  UnlinkIcon,
  UserCogIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listActivityLog } from "@/lib/mock-api/security";
import type { ActivityLogAction, ActivityLogEntry } from "@/lib/types";

const ACTION_ICONS: Record<ActivityLogAction, typeof LogInIcon> = {
  login: LogInIcon,
  password_changed: KeyRoundIcon,
  two_factor_enabled: ShieldIcon,
  two_factor_disabled: ShieldOffIcon,
  session_revoked: ShieldOffIcon,
  linked_account_connected: LinkIcon,
  linked_account_disconnected: UnlinkIcon,
  data_exported: UserCogIcon,
  privacy_prefs_updated: UserCogIcon,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ActivityLogPanel() {
  const [entries, setEntries] = useState<ActivityLogEntry[] | null>(null);

  useEffect(() => {
    (async () => {
      setEntries(await listActivityLog());
    })();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account activity</CardTitle>
        <CardDescription>Recent security-relevant events on your account.</CardDescription>
      </CardHeader>
      <CardContent>
        {!entries ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <ul className="space-y-1">
            {entries.map((entry) => {
              const Icon = ACTION_ICONS[entry.action];
              return (
                <li key={entry.id} className="flex items-center gap-3 py-1.5 text-sm">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1">{entry.detail}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
