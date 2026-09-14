"use client";

import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/collaboration/user-avatar";
import { listPresence } from "@/lib/mock-api/collaboration";
import { useProjectUsers } from "@/components/collaboration/use-project-users";
import { useWorkspaceStore } from "@/store/workspace-store";
import type { PresenceInfo } from "@/lib/types";

export function PresenceStrip({ projectId }: { projectId: string }) {
  const [presence, setPresence] = useState<PresenceInfo[]>([]);
  const files = useWorkspaceStore((s) => s.files);
  const { byId } = useProjectUsers(projectId);

  useEffect(() => {
    let cancelled = false;
    listPresence(projectId).then((rows) => {
      if (!cancelled) setPresence(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (presence.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-3 py-2">
      {presence.map((p) => {
        const user = byId[p.userId];
        if (!user) return null;
        const file = files.find((f) => f.id === p.fileId);
        return (
          <div key={p.userId} className="flex items-center gap-1.5" title={`${user.name} is active now`}>
            <span className="relative flex">
              <UserAvatar user={user} size="sm" ring />
              <span
                className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-2 ring-background"
                style={{ backgroundColor: p.color }}
              />
            </span>
            <span className="text-xs text-muted-foreground">
              {user.name.split(" ")[0]} · editing {file?.name ?? "this project"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
