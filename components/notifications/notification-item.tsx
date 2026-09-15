"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangleIcon,
  CheckIcon,
  MessageSquareIcon,
  MessagesSquareIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockDb } from "@/lib/mock-api/db";
import { Button } from "@/components/ui/button";
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
  onRespondToInvite?: (notificationId: string, accept: boolean) => void;
  compact?: boolean;
}

export function NotificationItem({ notification, onMarkRead, onRespondToInvite, compact }: NotificationItemProps) {
  const Icon = KIND_ICON[notification.kind];
  const project = notification.projectId
    ? mockDb.projects.find((p) => p.id === notification.projectId)
    : undefined;
  const isPendingInvite = notification.kind === "share_invite" && notification.inviteStatus === "pending";

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
        {isPendingInvite && onRespondToInvite && (
          <div className="mt-1.5 flex gap-1.5">
            <Button
              size="sm"
              className="h-6 gap-1 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRespondToInvite(notification.id, true);
              }}
            >
              <CheckIcon className="size-3" /> Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 gap-1 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRespondToInvite(notification.id, false);
              }}
            >
              <XIcon className="size-3" /> Decline
            </Button>
          </div>
        )}
      </div>
      {!notification.read && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
      )}
    </div>
  );

  // A pending invite isn't a "go view the project" notification yet (there's
  // no access to view until it's accepted) — render it as a plain, non-
  // navigating row with just the Accept/Decline buttons above, instead of
  // wrapping it in the Link every other project-scoped kind uses.
  if (isPendingInvite) {
    return <div className="block">{body}</div>;
  }

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
