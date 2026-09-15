"use server";

import { getDb } from "@/lib/db/mongoose";
import { UserModel } from "@/lib/db/models/user";
import { CollaboratorModel } from "@/lib/db/models/project";
import { toUser } from "@/lib/db/user-mapper";
import { requireProjectAccess } from "@/lib/mock-api/collaboration";
import type { User } from "@/lib/types";

const SEARCH_RESULT_LIMIT = 8;

// Same real-vs-legacy-mock id split duplicated in every lib/mock-api/*.ts
// file that needs it (see collaboration.ts's own copy of this comment).
const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;
function isRealId(value: string): boolean {
  return OBJECT_ID_RE.test(value);
}

/**
 * Finds registered users by name or email, to invite as a collaborator (see
 * sendCollaborationInvite in collaboration.ts) without typing an exact
 * email address. Real accounts only — no placeholder-user creation for a
 * not-yet-registered email like the legacy inviteCollaborator() path does,
 * since this is meant for a known community (a university campus) where
 * the person being invited is expected to already have an account.
 */
export async function searchUsers(projectId: string, query: string): Promise<User[]> {
  if (!isRealId(projectId)) return [];
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  await getDb();
  // Owner-only, same bucket as inviting itself — see requireProjectAccess's
  // own callers in collaboration.ts. If this doesn't throw, the caller IS
  // the project's owner, so excluding just this one id also excludes the
  // owner — no separate ProjectModel lookup needed.
  const ownerId = await requireProjectAccess(projectId, "owner");
  const existingCollaboratorIds = await CollaboratorModel.find({ projectId }).distinct("userId");
  const excludedIds = [ownerId, ...existingCollaboratorIds.map(String)];

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escaped, "i");
  const docs = await UserModel.find({
    _id: { $nin: excludedIds },
    $or: [{ name: pattern }, { email: pattern }],
  }).limit(SEARCH_RESULT_LIMIT);

  return docs.map(toUser);
}
