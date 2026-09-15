"use client";

import { NotificationItem } from "@/components/notifications/notification-item";
import type { NotificationItem as NotificationItemModel } from "@/lib/types";

interface NotificationListProps {
  notifications: NotificationItemModel[];
  onMarkRead: (notificationId: string) => void;
  /** Only needed where "share_invite" notifications can appear with real
   * Accept/Decline actions (currently just the /notifications page). */
  onRespondToInvite?: (notificationId: string, accept: boolean) => void;
  compact?: boolean;
  emptyMessage?: string;
}

export function NotificationList({
  notifications,
  onMarkRead,
  onRespondToInvite,
  compact,
  emptyMessage = "No notifications yet.",
}: NotificationListProps) {
  if (notifications.length === 0) {
    return <p className="px-3 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkRead={onMarkRead}
          onRespondToInvite={onRespondToInvite}
          compact={compact}
        />
      ))}
    </div>
  );
}
