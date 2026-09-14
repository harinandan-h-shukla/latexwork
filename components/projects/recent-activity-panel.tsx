"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HammerIcon,
  HistoryIcon,
  MessageSquareIcon,
  MessagesSquareIcon,
  ReplyIcon,
} from "lucide-react";

import { getRecentActivity, type ActivityItem, type ActivityKind } from "@/lib/mock-api/dashboard";
import { formatRelativeTime } from "@/components/collaboration/collab-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const KIND_ICON: Record<ActivityKind, typeof MessageSquareIcon> = {
  comment: MessageSquareIcon,
  reply: ReplyIcon,
  version: HistoryIcon,
  chat: MessagesSquareIcon,
  compile: HammerIcon,
};

export function RecentActivityPanel() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    getRecentActivity()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {items === null ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-4 text-sm text-text-secondary">
            Nothing new yet — activity across comments, versions, and chat will show up here.
          </p>
        ) : (
          <ul className="flex flex-col gap-3.5">
            {items.map((item) => {
              const Icon = KIND_ICON[item.kind];
              return (
                <li key={item.id} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-muted text-text-secondary">
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{item.text}</p>
                    <p className="text-xs text-text-tertiary">
                      <Link
                        href={`/projects/${item.projectId}`}
                        className="hover:text-foreground hover:underline"
                      >
                        {item.projectName}
                      </Link>
                      {" · "}
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
