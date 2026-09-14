"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, isThisYear, isToday, isYesterday } from "date-fns";
import { ArrowLeftIcon, BellIcon, CheckCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationList } from "@/components/notifications/notification-list";
import { listNotifications, markAllAsRead, markAsRead } from "@/lib/mock-api/notifications";
import { getCurrentUser } from "@/lib/mock-api/auth";
import type { NotificationItem } from "@/lib/types";

function dayLabel(dateIso: string): string {
  const date = new Date(dateIso);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, isThisYear(date) ? "MMMM d" : "MMMM d, yyyy");
}

function groupByDay(notifications: NotificationItem[]): Array<[string, NotificationItem[]]> {
  const groups = new Map<string, NotificationItem[]>();
  for (const notification of notifications) {
    const label = dayLabel(notification.createdAt);
    const bucket = groups.get(label);
    if (bucket) bucket.push(notification);
    else groups.set(label, [notification]);
  }
  return Array.from(groups.entries());
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const user = await getCurrentUser();
      if (!active) return;
      setUserId(user.id);
      const items = await listNotifications(user.id);
      if (!active) return;
      setNotifications(items);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const grouped = useMemo(() => groupByDay(notifications), [notifications]);

  async function handleMarkRead(notificationId: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    await markAsRead(notificationId);
  }

  async function handleMarkAllRead() {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllAsRead(userId);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/projects"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Back to dashboard
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BellIcon className="size-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheckIcon />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <BellIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            You&apos;re all caught up. New activity will show up here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(([label, items]) => (
            <div key={label} className="flex flex-col gap-1.5">
              <h2 className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
              </h2>
              <div className="rounded-xl ring-1 ring-foreground/10">
                <NotificationList notifications={items} onMarkRead={handleMarkRead} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
