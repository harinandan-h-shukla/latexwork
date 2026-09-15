// Same reasoning as collaboration.ts's own "use server" comment: this file's
// exports were mock-only (safe to bundle client-side) until the real
// Mongoose-backed branches below were added — those can only run server-side.
"use server";

import type { NotificationItem } from "@/lib/types";
import { CURRENT_USER_ID, delay, id, mockDb } from "@/lib/mock-api/db";
import { seedMockDb } from "@/lib/mock-api/seed";
import { getDb } from "@/lib/db/mongoose";
import { NotificationModel } from "@/lib/db/models/notifications";
import { toNotificationItem } from "@/lib/db/notification-mapper";
import { requireUserId } from "@/lib/db/require-user";

// Same real-vs-legacy-mock id split duplicated in every lib/mock-api/*.ts
// file that needs it (see collaboration.ts's own copy of this comment) — a
// mock id is never a 24-char hex string, a real Mongo id always is. Used
// here on userId/notificationId (not projectId) since notifications aren't
// scoped to a single project.
const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;
function isRealId(value: string): boolean {
  return OBJECT_ID_RE.test(value);
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}

function daysAgo(n: number): string {
  return hoursAgo(n * 24);
}

function seedNotifications(): void {
  if (mockDb.notifications.length > 0) return;
  const items: Array<Omit<NotificationItem, "id">> = [
    {
      userId: CURRENT_USER_ID,
      kind: "comment_mention",
      projectId: "proj_neurips",
      actorId: "user_aditi",
      text: 'Aditi Rao mentioned you in a comment on "NeurIPS 2026 Submission".',
      createdAt: hoursAgo(1),
      read: false,
    },
    {
      userId: CURRENT_USER_ID,
      kind: "chat_mention",
      projectId: "proj_shared_iclr",
      actorId: "user_marco",
      text: 'Marco Dias mentioned you in project chat on "ICLR Rebuttal (shared)".',
      createdAt: hoursAgo(3),
      read: false,
    },
    {
      userId: CURRENT_USER_ID,
      kind: "share_invite",
      projectId: "proj_grant",
      actorId: "user_lin",
      text: 'Lin Wei invited you to collaborate on "SERB Grant Proposal" as an editor.',
      createdAt: hoursAgo(5),
      read: false,
    },
    {
      userId: CURRENT_USER_ID,
      kind: "compile_failure",
      projectId: "proj_thesis",
      text: 'Compile failed on "PhD Thesis — Chapter 4": undefined control sequence on line 214.',
      createdAt: hoursAgo(8),
      read: false,
    },
    {
      userId: CURRENT_USER_ID,
      kind: "collaborator_joined",
      projectId: "proj_neurips",
      actorId: "user_lin",
      text: 'Lin Wei accepted their invite and joined "NeurIPS 2026 Submission".',
      createdAt: daysAgo(1),
      read: true,
    },
    {
      userId: CURRENT_USER_ID,
      kind: "comment_mention",
      projectId: "proj_shared_iclr",
      actorId: "user_marco",
      text: 'Marco Dias replied to your comment on "ICLR Rebuttal (shared)".',
      createdAt: daysAgo(2),
      read: true,
    },
    {
      userId: CURRENT_USER_ID,
      kind: "compile_failure",
      projectId: "proj_grant",
      text: 'Compile timed out on "SERB Grant Proposal" after 90 seconds.',
      createdAt: daysAgo(3),
      read: true,
    },
    {
      userId: CURRENT_USER_ID,
      kind: "share_invite",
      projectId: "proj_cv",
      actorId: "user_aditi",
      text: 'Aditi Rao invited you to view "Academic CV".',
      createdAt: daysAgo(5),
      read: true,
    },
  ];
  mockDb.notifications.push(...items.map((item) => ({ id: id("notif"), ...item })));
}

export async function listNotifications(userId: string): Promise<NotificationItem[]> {
  if (isRealId(userId)) {
    await getDb();
    const sessionUserId = await requireUserId();
    if (sessionUserId !== userId) throw new Error("Not authorized: you can only view your own notifications");
    const docs = await NotificationModel.find({ userId }).sort({ createdAt: -1 });
    return docs.map(toNotificationItem);
  }

  seedMockDb();
  seedNotifications();
  await delay();
  return mockDb.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function markAsRead(notificationId: string): Promise<void> {
  if (isRealId(notificationId)) {
    await getDb();
    const sessionUserId = await requireUserId();
    await NotificationModel.updateOne({ _id: notificationId, userId: sessionUserId }, { read: true });
    return;
  }

  await delay(150);
  const notification = mockDb.notifications.find((n) => n.id === notificationId);
  if (notification) notification.read = true;
}

export async function markAllAsRead(userId: string): Promise<void> {
  if (isRealId(userId)) {
    await getDb();
    const sessionUserId = await requireUserId();
    if (sessionUserId !== userId) throw new Error("Not authorized: you can only update your own notifications");
    await NotificationModel.updateMany({ userId }, { read: true });
    return;
  }

  await delay(250);
  for (const notification of mockDb.notifications) {
    if (notification.userId === userId) notification.read = true;
  }
}
