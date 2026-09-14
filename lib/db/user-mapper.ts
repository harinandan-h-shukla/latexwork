import "server-only";
import type { HydratedDocument } from "mongoose";
import type { User } from "@/lib/types";
import type { UserDoc } from "@/lib/db/models/user";

// Pure data mapping, not an RPC action — deliberately its own module (not
// exported from lib/mock-api/auth.ts, despite living there originally) so
// it can be shared by other "use server" files (e.g. collaboration.ts)
// without becoming a Server Action itself. A "use server" file may only
// export async functions; this is a plain sync helper other server-only
// code imports directly.
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
