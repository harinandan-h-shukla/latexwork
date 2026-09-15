import "server-only";
import type { HydratedDocument } from "mongoose";
import type { NotificationItem } from "@/lib/types";
import type { NotificationDoc } from "@/lib/db/models/notifications";

// Same reasoning as lib/db/user-mapper.ts's toUser(): a plain sync mapper,
// not itself a Server Action, so other "use server" files can import it.
export function toNotificationItem(doc: HydratedDocument<NotificationDoc>): NotificationItem {
  const obj = doc.toObject({ getters: true });
  return {
    id: String(obj._id),
    userId: String(obj.userId),
    kind: obj.kind,
    projectId: obj.projectId ? String(obj.projectId) : undefined,
    actorId: obj.actorId ? String(obj.actorId) : undefined,
    text: obj.text,
    createdAt: (obj.createdAt as Date).toISOString(),
    read: obj.read,
    role: obj.role ?? undefined,
    inviteStatus: obj.inviteStatus ?? undefined,
  };
}
