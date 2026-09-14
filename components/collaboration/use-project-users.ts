"use client";

import { useEffect, useState } from "react";
import { listCollaborators } from "@/lib/mock-api/collaboration";
import type { User } from "@/lib/types";

/**
 * Resolves author names/avatars for a project's comments, chat, track
 * changes, and presence — those all used to read the mock-only `mockDb.users`
 * singleton directly, which is empty for real (Mongo) projects, since real
 * accounts never get seeded into it. listCollaborators() already has the
 * real per-project user list (owner + collaborators, both mock and real
 * paths) — this just reshapes it into the id→User map/array these panels
 * actually need instead of duplicating a fetch in each of them.
 */
export function useProjectUsers(projectId: string): { users: User[]; byId: Record<string, User> } {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    let cancelled = false;
    listCollaborators(projectId).then((rows) => {
      if (!cancelled) setUsers(rows.map((r) => r.user));
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const byId: Record<string, User> = {};
  for (const u of users) byId[u.id] = u;
  return { users, byId };
}
