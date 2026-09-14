"use server";

// Was entirely mock — every function here operated on a hardcoded
// CURRENT_USER_ID against the in-memory mockDb, a leftover from before real
// auth existed. Real signed-in users (auth.ts, real Mongo ObjectId ids) were
// never wired to this file at all, so changing anything in Settings —
// profile, password, 2FA, editor defaults (including compiler preference),
// notification prefs, plan tier — silently updated a mock object nobody
// ever read, not the real account. Found while wiring a compiler-choice
// dialog on top of updateEditorDefaults and discovering it wouldn't persist
// for a real user at all.

import bcrypt from "bcryptjs";
import type { EditorDefaults, EmailNotificationPrefs, LinkedAccount, User } from "@/lib/types";
import { id } from "@/lib/mock-api/db";
import { getDb } from "@/lib/db/mongoose";
import { UserModel } from "@/lib/db/models/user";
import { requireUserId } from "@/lib/db/require-user";
import { toUser } from "@/lib/db/user-mapper";
import type { HydratedDocument } from "mongoose";
import type { UserDoc } from "@/lib/db/models/user";

const DEFAULT_EMAIL_PREFS: EmailNotificationPrefs = {
  commentMentions: true,
  shareInvites: true,
  compileFailures: true,
};

async function requireCurrentUserDoc(): Promise<HydratedDocument<UserDoc>> {
  await getDb();
  const userId = await requireUserId();
  const doc = await UserModel.findById(userId);
  if (!doc) throw new Error("Current user not found");
  return doc;
}

export async function updateProfile(
  patch: Partial<Pick<User, "name" | "email" | "avatarUrl">>
): Promise<User> {
  const user = await requireCurrentUserDoc();
  if (patch.name !== undefined) user.name = patch.name;
  if (patch.email !== undefined) user.email = patch.email.trim().toLowerCase();
  if (patch.avatarUrl !== undefined) user.avatarUrl = patch.avatarUrl;
  await user.save();
  return toUser(user);
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await getDb();
  const userId = await requireUserId();
  const doc = await UserModel.findById(userId).select("+passwordHash");
  if (!doc) throw new Error("Current user not found");
  const valid = doc.passwordHash ? await bcrypt.compare(input.currentPassword, doc.passwordHash) : false;
  if (!valid) throw new Error("Current password is incorrect.");
  doc.passwordHash = await bcrypt.hash(input.newPassword, 10);
  await doc.save();
}

export async function setTwoFactorEnabled(enabled: boolean): Promise<void> {
  const user = await requireCurrentUserDoc();
  user.twoFactorEnabled = enabled;
  await user.save();
}

export async function connectLinkedAccount(
  provider: LinkedAccount["provider"]
): Promise<LinkedAccount> {
  const user = await requireCurrentUserDoc();
  const existing = user.linkedAccounts?.find((a) => a.provider === provider);
  if (existing) {
    return {
      provider: existing.provider,
      connectedAt: new Date(existing.connectedAt).toISOString(),
      externalId: existing.externalId,
      externalEmail: existing.externalEmail ?? undefined,
    };
  }
  const account = {
    provider,
    connectedAt: new Date(),
    externalId: id(provider),
    externalEmail: user.email,
  };
  user.linkedAccounts = [...(user.linkedAccounts ?? []), account] as never;
  await user.save();
  return { ...account, connectedAt: account.connectedAt.toISOString() };
}

export async function disconnectLinkedAccount(provider: LinkedAccount["provider"]): Promise<void> {
  const user = await requireCurrentUserDoc();
  user.linkedAccounts = (user.linkedAccounts ?? []).filter((a) => a.provider !== provider) as never;
  await user.save();
}

export async function updateEditorDefaults(
  patch: Partial<EditorDefaults>
): Promise<EditorDefaults> {
  const user = await requireCurrentUserDoc();
  user.editorDefaults = { ...(user.editorDefaults ?? {}), ...patch } as never;
  await user.save();
  return toUser(user).editorDefaults;
}

export async function updateEmailNotificationPrefs(
  patch: Partial<EmailNotificationPrefs>
): Promise<EmailNotificationPrefs> {
  const user = await requireCurrentUserDoc();
  user.emailNotificationPrefs = {
    ...DEFAULT_EMAIL_PREFS,
    ...user.emailNotificationPrefs,
    ...patch,
  };
  await user.save();
  return user.emailNotificationPrefs;
}

export async function updatePlanTier(tier: User["planTier"]): Promise<User> {
  const user = await requireCurrentUserDoc();
  user.planTier = tier;
  await user.save();
  return toUser(user);
}
