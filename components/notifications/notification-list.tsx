"use client";

import { NotificationItem } from "@/components/notifications/notification-item";
import type { NotificationItem as NotificationItemModel } from "@/lib/types";

interface NotificationListProps {
  notifications: NotificationItemModel[];
  onMarkRead: (notificationId: string) => void;
  compact?: boolean;
  emptyMessage?: string;
}

export function NotificationList({
  notifications,
  onMarkRead,
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
          compact={compact}
        />
      ))}
    </div>
  );
}
