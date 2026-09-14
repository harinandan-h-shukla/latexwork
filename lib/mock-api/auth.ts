"use server";

// Real auth, backed by MongoDB + bcrypt + an encrypted httpOnly session
// cookie (iron-session). Google/GitHub OAuth and institutional SSO need a
// registered 3rd-party provider (client id/secret) this environment doesn't
// have configured, so those two stay mocked for now — see oAuthLogIn/
// ssoLogIn below. Function names/signatures are unchanged from the Phase 1
// mock so no calling component needed to change.

import bcrypt from "bcryptjs";
import type { User } from "@/lib/types";
import { getDb } from "@/lib/db/mongoose";
import { UserModel, type UserDoc } from "@/lib/db/models/user";
import { getSession, setSessionUser, clearSession } from "@/lib/session";
import type { HydratedDocument } from "mongoose";

export type OAuthProvider = "google" | "orcid" | "github";

// Fixed bcrypt hash of an arbitrary string, compared against when no real
// user/passwordHash exists — see logIn()'s comment.
const DUMMY_HASH_FOR_TIMING = "$2b$10$EDHCGqgQ16kO94IS8dwEO.nfFlikRXBL0a00ofPbTMxKWD9quC4G2";

// In-memory login-attempt rate limiting, keyed by normalized email. Good
// enough for a single-instance deployment; a multi-instance production
// deployment would need this in a shared store (Redis etc.) instead, since
// each instance would otherwise track attempts independently.
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; windowStartedAt: number; lockedUntil?: number }>();

function msUntilLoginUnlocked(email: string): number {
  const entry = loginAttempts.get(email);
  if (!entry?.lockedUntil) return 0;
  return Math.max(0, entry.lockedUntil - Date.now());
}

function recordFailedLogin(email: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(email);
  if (!entry || now - entry.windowStartedAt > LOGIN_ATTEMPT_WINDOW_MS) {
    loginAttempts.set(email, { count: 1, windowStartedAt: now });
    return;
  }
  entry.count += 1;
  if (entry.count >= LOGIN_ATTEMPT_LIMIT) {
    entry.lockedUntil = now + LOGIN_LOCKOUT_MS;
  }
}

function clearFailedLogins(email: string): void {
  loginAttempts.delete(email);
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface LogInInput {
  email: string;
  password: string;
}

export function toUser(doc: HydratedDocument<UserDoc>): User {
  const obj = doc.toObject({ getters: true });
  return {
    id: String(obj._id),
    name: obj.name,
    email: obj.email,
    avatarUrl: obj.avatarUrl ?? undefined,
    createdAt: (obj.createdAt as Date).toISOString(),
    twoFactorEnabled: obj.twoFactorEnabled,
    linkedAccounts: (obj.linkedAccounts ?? []).map((a) => ({
      provider: a.provider,
      connectedAt: new Date(a.connectedAt).toISOString(),
      externalId: a.externalId,
      externalEmail: a.externalEmail ?? undefined,
    })),
    editorDefaults: {
      keybinding: obj.editorDefaults?.keybinding ?? "default",
      theme: obj.editorDefaults?.theme ?? "default",
      fontSize: obj.editorDefaults?.fontSize ?? 14,
      tabSize: obj.editorDefaults?.tabSize ?? 2,
      autocomplete: obj.editorDefaults?.autocomplete ?? true,
      wordWrap: obj.editorDefaults?.wordWrap ?? true,
      lineNumbers: obj.editorDefaults?.lineNumbers ?? true,
      compilerPreference: obj.editorDefaults?.compilerPreference ?? undefined,
    },
    planTier: obj.planTier,
    storageQuotaBytes: obj.storageQuotaBytes,
    storageUsedBytes: obj.storageUsedBytes,
    emailNotificationPrefs: obj.emailNotificationPrefs,
    privacyPrefs: obj.privacyPrefs,
  };
}

export async function getCurrentUser(): Promise<User> {
  await getDb();
  const session = await getSession();
  if (!session.userId) throw new Error("Not signed in");
  const doc = await UserModel.findById(session.userId);
  if (!doc) throw new Error("Current user not found");
  return toUser(doc);
}

export async function signUp(input: SignUpInput): Promise<User> {
  await getDb();
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim()) throw new Error("Name is required");
  if (!email) throw new Error("Email is required");
  if (input.password.length < 8) throw new Error("Password must be at least 8 characters");

  const existing = await UserModel.findOne({ email });
  if (existing) throw new Error("An account with this email already exists");

  const passwordHash = await bcrypt.hash(input.password, 10);
  const doc = await UserModel.create({
    name: input.name.trim(),
    email,
    passwordHash,
  });

  await setSessionUser(String(doc._id));
  return toUser(doc);
}

export async function logIn(input: LogInInput): Promise<User> {
  await getDb();
  const email = input.email.trim().toLowerCase();

  const lockedFor = msUntilLoginUnlocked(email);
  if (lockedFor > 0) {
    throw new Error(`Too many failed attempts. Try again in ${Math.ceil(lockedFor / 1000 / 60)} minute(s).`);
  }

  const doc = await UserModel.findOne({ email }).select("+passwordHash");
  // Always run bcrypt.compare, even for a nonexistent account or an
  // OAuth-only one with no passwordHash — comparing against a fixed dummy
  // hash keeps response time consistent either way, so timing can't be used
  // to probe which emails have accounts.
  const valid = await bcrypt.compare(input.password, doc?.passwordHash ?? DUMMY_HASH_FOR_TIMING);
  if (!doc || !doc.passwordHash || !valid) {
    recordFailedLogin(email);
    throw new Error("Incorrect email or password");
  }

  clearFailedLogins(email);
  await setSessionUser(String(doc._id));
  return toUser(doc);
}

/**
 * Not real yet — Google/GitHub OAuth requires a registered app (client id +
 * secret) that isn't configured in this environment. Deliberately left
 * mocked rather than silently faking a provider round-trip; the UI disables
 * these buttons rather than pretending they authenticate a real account.
 */
export async function oAuthLogIn(_provider: OAuthProvider): Promise<never> {
  throw new Error("OAuth sign-in isn't configured yet — it needs a registered provider app.");
}

/** Same 3rd-party gap as oAuthLogIn — institutional SSO needs a real identity provider. */
export async function ssoLogIn(_institutionDomain: string): Promise<never> {
  throw new Error("Institutional SSO isn't configured yet — it needs a registered identity provider.");
}

export async function logOut(): Promise<void> {
  await clearSession();
}
