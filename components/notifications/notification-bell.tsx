"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationList } from "@/components/notifications/notification-list";
import { listNotifications, markAllAsRead, markAsRead } from "@/lib/mock-api/notifications";
import { getCurrentUser } from "@/lib/mock-api/auth";
import type { NotificationItem } from "@/lib/types";

const PREVIEW_COUNT = 6;

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="relative" />}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <span className="sr-only">Notifications</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
              Mark all as read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {loading ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <NotificationList
              notifications={notifications.slice(0, PREVIEW_COUNT)}
              onMarkRead={handleMarkRead}
              compact
            />
          )}
        </div>
        <div className="border-t border-border p-1">
          <Link
            href="/notifications"
            className="block rounded-md px-2 py-1.5 text-center text-sm text-primary hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            View all notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
