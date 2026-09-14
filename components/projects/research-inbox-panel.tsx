"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertOctagonIcon, AlertTriangleIcon, InboxIcon, MessageSquareIcon } from "lucide-react";

import { getResearchInbox, type InboxItem } from "@/lib/mock-api/dashboard";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ITEM_ICON: Record<string, typeof MessageSquareIcon> = {
  "unresolved-comments": MessageSquareIcon,
  "broken-refs": AlertTriangleIcon,
  "duplicate-keys": AlertOctagonIcon,
};

const TONE_CLASSES: Record<InboxItem["tone"], string> = {
  default: "bg-muted text-text-secondary",
  warning: "bg-warning-soft text-warning",
  error: "bg-error-soft text-error",
};

export function ResearchInboxPanel() {
  const [items, setItems] = useState<InboxItem[] | null>(null);

  useEffect(() => {
    getResearchInbox()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Research inbox</CardTitle>
      </CardHeader>
      <CardContent>
        {items === null ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <InboxIcon className="size-5 text-text-tertiary" />
            <p className="text-sm text-text-secondary">
              You&rsquo;re all caught up — no open comments or reference issues.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => {
              const Icon = ITEM_ICON[item.id] ?? InboxIcon;
              return (
                <li key={item.id}>
                  <Link
                    href={`/projects/${item.projectId}`}
                    className="flex items-center gap-2.5 rounded-lg px-1 py-1 -mx-1 transition-colors hover:bg-muted"
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-lg",
                        TONE_CLASSES[item.tone],
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm text-foreground">
                      <span className="font-medium tabular-nums">{item.count}</span>{" "}
                      {item.text}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
