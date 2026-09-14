import type { User } from "@/lib/types";

const MENTION_PALETTE = ["#f59e0b", "#8b5cf6", "#10b981", "#ec4899", "#3b82f6", "#ef4444"];

export function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return MENTION_PALETTE[hash % MENTION_PALETTE.length];
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function extractMentionIds(text: string, users: User[]): string[] {
  const ids: string[] = [];
  for (const user of users) {
    const firstName = user.name.split(" ")[0];
    if (firstName && text.includes(`@${firstName}`)) {
      ids.push(user.id);
    }
  }
  return ids;
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.round(diffDay / 30);
  return `${diffMonth}mo ago`;
}
