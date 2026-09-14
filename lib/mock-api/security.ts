import type { ActivityLogAction, ActivityLogEntry, PrivacyPrefs, SessionInfo } from "@/lib/types";
import { CURRENT_USER_ID, delay, id, mockDb } from "@/lib/mock-api/db";
import { seedMockDb } from "@/lib/mock-api/seed";

let seeded = false;

function daysAgo(n: number, hours = 0): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000 - hours * 60 * 60 * 1000).toISOString();
}

const sessions: SessionInfo[] = [];
const activityLog: ActivityLogEntry[] = [];

function seedSecurityData(): void {
  if (seeded) return;
  seeded = true;

  sessions.push(
    {
      id: "session_current",
      userId: CURRENT_USER_ID,
      device: "This device",
      browser: "Chrome 130",
      os: "Linux",
      ipAddress: "10.57.1.110",
      location: "Roorkee, India",
      isCurrent: true,
      createdAt: daysAgo(0, 3),
      lastActiveAt: new Date().toISOString(),
    },
    {
      id: "session_phone",
      userId: CURRENT_USER_ID,
      device: "iPhone 15",
      browser: "Safari 18",
      os: "iOS 18",
      ipAddress: "49.36.12.88",
      location: "Roorkee, India",
      isCurrent: false,
      createdAt: daysAgo(9),
      lastActiveAt: daysAgo(2),
    },
    {
      id: "session_laptop_office",
      userId: CURRENT_USER_ID,
      device: "MacBook Pro",
      browser: "Firefox 132",
      os: "macOS 15",
      ipAddress: "203.0.113.42",
      location: "New Delhi, India",
      isCurrent: false,
      createdAt: daysAgo(30),
      lastActiveAt: daysAgo(14),
    }
  );

  activityLog.push(
    {
      id: id("activity"),
      userId: CURRENT_USER_ID,
      action: "login",
      detail: "Signed in from Chrome on Linux",
      ipAddress: "10.57.1.110",
      createdAt: daysAgo(0, 3),
    },
    {
      id: id("activity"),
      userId: CURRENT_USER_ID,
      action: "two_factor_enabled",
      detail: "Two-factor authentication enabled",
      ipAddress: "10.57.1.110",
      createdAt: daysAgo(5),
    },
    {
      id: id("activity"),
      userId: CURRENT_USER_ID,
      action: "password_changed",
      detail: "Password changed",
      ipAddress: "203.0.113.42",
      createdAt: daysAgo(30),
    },
    {
      id: id("activity"),
      userId: CURRENT_USER_ID,
      action: "linked_account_connected",
      detail: "Connected Google account",
      ipAddress: "10.57.1.110",
      createdAt: daysAgo(120),
    }
  );
}

function logActivity(action: ActivityLogAction, detail: string): void {
  activityLog.unshift({
    id: id("activity"),
    userId: CURRENT_USER_ID,
    action,
    detail,
    ipAddress: "10.57.1.110",
    createdAt: new Date().toISOString(),
  });
}

export async function listSessions(): Promise<SessionInfo[]> {
  seedSecurityData();
  await delay(300);
  return sessions
    .filter((s) => s.userId === CURRENT_USER_ID)
    .sort((a, b) => (a.isCurrent ? -1 : b.isCurrent ? 1 : 0));
}

export async function revokeSession(sessionId: string): Promise<void> {
  seedSecurityData();
  await delay(400);
  const session = sessions.find((s) => s.id === sessionId);
  if (!session || session.isCurrent) return;
  const index = sessions.indexOf(session);
  sessions.splice(index, 1);
  logActivity("session_revoked", `Revoked session on ${session.device}`);
}

export async function listActivityLog(): Promise<ActivityLogEntry[]> {
  seedSecurityData();
  await delay(300);
  return activityLog.filter((a) => a.userId === CURRENT_USER_ID);
}

export async function updatePrivacyPrefs(patch: Partial<PrivacyPrefs>): Promise<PrivacyPrefs> {
  seedMockDb();
  await delay(300);
  const user = mockDb.users.find((u) => u.id === CURRENT_USER_ID);
  if (!user) throw new Error("Current user not found");
  const current: PrivacyPrefs = user.privacyPrefs ?? {
    indexPublicProjects: false,
    shareUsageAnalytics: true,
  };
  user.privacyPrefs = { ...current, ...patch };
  logActivity("privacy_prefs_updated", "Updated privacy preferences");
  return user.privacyPrefs;
}

export async function exportUserData(): Promise<{ filename: string; content: string }> {
  seedMockDb();
  seedSecurityData();
  await delay(700);
  const user = mockDb.users.find((u) => u.id === CURRENT_USER_ID);
  if (!user) throw new Error("Current user not found");
  const projects = mockDb.projects.filter((p) => p.ownerId === CURRENT_USER_ID && !p.trashed);
  const payload = {
    exportedAt: new Date().toISOString(),
    profile: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt, planTier: user.planTier },
    editorDefaults: user.editorDefaults,
    privacyPrefs: user.privacyPrefs,
    projects: projects.map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt, updatedAt: p.updatedAt, tags: p.tags })),
  };
  logActivity("data_exported", "Requested a data export");
  return { filename: `inkwell-data-export-${Date.now()}.json`, content: JSON.stringify(payload, null, 2) };
}

export async function deleteAccount(confirmationText: string): Promise<void> {
  seedMockDb();
  await delay(800);
  if (confirmationText !== "DELETE") {
    throw new Error('Type "DELETE" to confirm.');
  }
}
