"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangleIcon,
  MessageSquareIcon,
  MessagesSquareIcon,
  UserPlusIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockDb } from "@/lib/mock-api/db";
import type { NotificationItem as NotificationItemModel, NotificationKind } from "@/lib/types";

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  comment_mention: MessageSquareIcon,
  chat_mention: MessagesSquareIcon,
  share_invite: UserPlusIcon,
  compile_failure: AlertTriangleIcon,
  collaborator_joined: UsersIcon,
};

interface NotificationItemProps {
  notification: NotificationItemModel;
  onMarkRead: (notificationId: string) => void;
  compact?: boolean;
}

export function NotificationItem({ notification, onMarkRead, compact }: NotificationItemProps) {
  const Icon = KIND_ICON[notification.kind];
  const project = notification.projectId
    ? mockDb.projects.find((p) => p.id === notification.projectId)
    : undefined;

  function handleClick() {
    if (!notification.read) onMarkRead(notification.id);
  }

  const body = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted",
        !notification.read && "bg-primary/5"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
          notification.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p
          className={cn(
            "text-sm leading-snug text-foreground/90",
            !notification.read && "font-medium text-foreground"
          )}
        >
          {notification.text}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
          {project && !compact && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{project.name}</span>
            </>
          )}
        </div>
      </div>
      {!notification.read && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
      )}
    </div>
  );

  if (notification.projectId) {
    return (
      <Link href={`/projects/${notification.projectId}`} onClick={handleClick} className="block">
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={handleClick} className="block w-full text-left">
      {body}
    </button>
  );
}
