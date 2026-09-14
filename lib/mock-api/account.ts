import type { EditorDefaults, EmailNotificationPrefs, LinkedAccount, User } from "@/lib/types";
import { CURRENT_USER_ID, delay, id, mockDb } from "@/lib/mock-api/db";
import { seedMockDb } from "@/lib/mock-api/seed";

const DEFAULT_EMAIL_PREFS: EmailNotificationPrefs = {
  commentMentions: true,
  shareInvites: true,
  compileFailures: true,
};

function getCurrentUserRecord(): User {
  seedMockDb();
  const user = mockDb.users.find((u) => u.id === CURRENT_USER_ID);
  if (!user) throw new Error("Current user not found");
  return user;
}

export async function updateProfile(
  patch: Partial<Pick<User, "name" | "email" | "avatarUrl">>
): Promise<User> {
  await delay(400);
  const user = getCurrentUserRecord();
  Object.assign(user, patch);
  return user;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await delay(500);
  if (input.currentPassword === "wrong") {
    throw new Error("Current password is incorrect.");
  }
}

export async function setTwoFactorEnabled(enabled: boolean): Promise<void> {
  await delay(400);
  const user = getCurrentUserRecord();
  user.twoFactorEnabled = enabled;
}

export async function connectLinkedAccount(
  provider: LinkedAccount["provider"]
): Promise<LinkedAccount> {
  await delay(600);
  const user = getCurrentUserRecord();
  const existing = user.linkedAccounts.find((a) => a.provider === provider);
  if (existing) return existing;
  const account: LinkedAccount = {
    provider,
    connectedAt: new Date().toISOString(),
    externalId: id(provider),
    externalEmail: user.email,
  };
  user.linkedAccounts.push(account);
  return account;
}

export async function disconnectLinkedAccount(provider: LinkedAccount["provider"]): Promise<void> {
  await delay(400);
  const user = getCurrentUserRecord();
  user.linkedAccounts = user.linkedAccounts.filter((a) => a.provider !== provider);
}

export async function updateEditorDefaults(
  patch: Partial<EditorDefaults>
): Promise<EditorDefaults> {
  await delay(300);
  const user = getCurrentUserRecord();
  user.editorDefaults = { ...user.editorDefaults, ...patch };
  return user.editorDefaults;
}

export async function updateEmailNotificationPrefs(
  patch: Partial<EmailNotificationPrefs>
): Promise<EmailNotificationPrefs> {
  await delay(300);
  const user = getCurrentUserRecord();
  user.emailNotificationPrefs = {
    ...DEFAULT_EMAIL_PREFS,
    ...user.emailNotificationPrefs,
    ...patch,
  };
  return user.emailNotificationPrefs;
}

export async function updatePlanTier(tier: User["planTier"]): Promise<User> {
  await delay(500);
  const user = getCurrentUserRecord();
  user.planTier = tier;
  return user;
}
