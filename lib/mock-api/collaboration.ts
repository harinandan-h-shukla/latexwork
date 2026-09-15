"use server";

// This file was missing "use server" (unlike files.ts/projects.ts/auth.ts,
// which all have it) — harmless while every export here only touched the
// plain in-memory mockDb (fine to bundle into the browser), but the real
// Mongoose-backed branches added below can only run server-side. Without
// this directive Next.js bundles the whole module for the client, which is
// both wrong (Mongoose doesn't run in a browser) and was breaking the build
// outright (an import from another "use server" file didn't resolve inside
// a client bundle).
import type {
  ChatMessage,
  Collaborator,
  Comment,
  CommentReply,
  PresenceInfo,
  Role,
  TrackedChange,
  User,
} from "@/lib/types";
import { CURRENT_USER_ID, delay, id, mockDb } from "@/lib/mock-api/db";
import { seedMockDb } from "@/lib/mock-api/seed";
import { getDb } from "@/lib/db/mongoose";
import { ProjectModel, CollaboratorModel } from "@/lib/db/models/project";
import { UserModel } from "@/lib/db/models/user";
import { toUser } from "@/lib/db/user-mapper";
import { requireUserId } from "@/lib/db/require-user";
import {
  CommentModel,
  TrackedChangeModel,
  ChatMessageModel,
  PresenceModel,
  type CommentDoc,
  type TrackedChangeDoc,
  type ChatMessageDoc,
  type PresenceDoc,
} from "@/lib/db/models/collaboration";
import type { HydratedDocument, Types } from "mongoose";

// Same real-vs-legacy-mock id split used throughout lib/mock-api/*.ts (a
// mock id is never a 24-char hex string, a real Mongo id always is).
const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;
function isRealId(value: string): boolean {
  return OBJECT_ID_RE.test(value);
}

/** Total people who can work on one project, owner included — the cap the
 * user asked for ("max 10 person can work"). */
const MAX_COLLABORATORS_PER_PROJECT = 10;

// ---------------------------------------------------------------------------
// Authorization helpers (real-Mongo projects only — the legacy in-memory
// demo path has no session and stays scoped to CURRENT_USER_ID as before).
//
// SECURITY FIX: every export below that reads or mutates something scoped to
// a real project (the project itself, its files/comments/tracked
// changes/chat/presence/collaborator list) used to trust whatever
// projectId/userId the client sent, with no check that the caller actually
// had any relationship to that project. Concretely, this let any signed-in
// user who knew (or guessed) a project's Mongo ObjectId read its
// comments/chat/tracked changes, and let any collaborator — including a
// "viewer" — call updateCollaboratorRole/removeCollaborator/transferOwnership
// on collaborators of a project they didn't own. Every function now verifies
// access before doing anything, via the same
// ProjectModel.ownerId / CollaboratorModel.exists({ projectId, userId })
// query shape already used correctly in lib/mock-api/projects.ts.
// ---------------------------------------------------------------------------

/**
 * Verifies the calling user has real access to `projectId` and returns their
 * user id. Throws a real `Error` (never a silent no-op/empty result) when
 * they don't, so a disallowed caller gets something debuggable.
 *
 * - minRole "collaborator" (default): the project owner OR any collaborator
 *   row (any role — editor/reviewer/viewer) may proceed. This is for
 *   reading/writing project content: files, comments, tracked changes, chat,
 *   presence, and listing who has access. The 4-role system
 *   (owner/editor/reviewer/viewer, see lib/types.ts's Role) doesn't have any
 *   finer-grained read/write split enforced anywhere else in this codebase
 *   (no existing frontend gate makes the editor read-only for
 *   reviewer/viewer, for instance), so this fix doesn't invent one — it only
 *   closes the "no relationship to the project at all" hole.
 * - minRole "owner": only the project's current owner may proceed. Used for
 *   collaborator-management mutations (inviting, changing someone else's
 *   role, removing someone else, transferring ownership, toggling
 *   public/private visibility) — mirroring the Share dialog's own
 *   isOwner-gated UI for the transfer/remove buttons, which the server
 *   never actually enforced (and which the role-change dropdown and the
 *   public-visibility switch didn't get gated by at all, client or server —
 *   the actual exploited bug). Judgment call: an editor is not treated as
 *   able to manage sharing, only the owner is — there's no existing
 *   precedent in this codebase suggesting collaborator management should be
 *   delegated below owner.
 */
async function requireProjectAccess(
  projectId: string,
  minRole: "owner" | "collaborator" = "collaborator"
): Promise<string> {
  const userId = await requireUserId();
  const project = await ProjectModel.findById(projectId).select("ownerId");
  if (!project) throw new Error("Project not found");
  if (String(project.ownerId) === userId) return userId;
  if (minRole === "owner") {
    throw new Error("Not authorized: only the project owner can do this");
  }
  const isCollaborator = await CollaboratorModel.exists({ projectId, userId });
  if (!isCollaborator) {
    throw new Error("Not authorized: you don't have access to this project");
  }
  return userId;
}

/**
 * Same as requireProjectAccess(projectId, "owner"), except the caller is
 * also allowed through when they are acting on their own collaborator row
 * (targetUserId === caller) — a collaborator should always be able to
 * remove *themselves* (leave the project) without needing owner rights,
 * even though no "Leave project" UI calls this yet.
 */
async function requireOwnerOrSelf(projectId: string, targetUserId: string): Promise<string> {
  const callerId = await requireUserId();
  if (callerId === targetUserId) return callerId;
  const project = await ProjectModel.findById(projectId).select("ownerId");
  if (!project) throw new Error("Project not found");
  if (String(project.ownerId) !== callerId) {
    throw new Error("Not authorized: only the project owner can do this");
  }
  return callerId;
}

/** Looks up which project a comment belongs to, for access checks on
 * comment-id-keyed operations (reply/resolve/reopen) that don't get a
 * projectId from the caller directly. */
async function projectIdForComment(commentId: string): Promise<string> {
  const comment = await CommentModel.findById(commentId).select("projectId");
  if (!comment) throw new Error("Comment not found");
  return String(comment.projectId);
}

/** Same as projectIdForComment, for tracked-change-id-keyed operations
 * (accept/reject one change). */
async function projectIdForChange(changeId: string): Promise<string> {
  const change = await TrackedChangeModel.findById(changeId).select("projectId");
  if (!change) throw new Error("Tracked change not found");
  return String(change.projectId);
}

// ---------------------------------------------------------------------------
// Real-Mongo → shared-type mappers, mirroring the toUser() pattern already
// used elsewhere — ObjectId fields go through String(), Date fields go
// through .toISOString(), so every real branch below returns exactly the
// same shape the mock branch already returns.
// ---------------------------------------------------------------------------

function toComment(doc: HydratedDocument<CommentDoc>): Comment {
  const obj = doc.toObject({ getters: true });
  return {
    id: String(obj._id),
    projectId: String(obj.projectId),
    fileId: String(obj.fileId),
    authorId: String(obj.authorId),
    anchorFrom: obj.anchorFrom,
    anchorTo: obj.anchorTo,
    quotedText: obj.quotedText,
    text: obj.text,
    createdAt: (obj.createdAt as Date).toISOString(),
    resolved: obj.resolved ?? false,
    resolvedBy: obj.resolvedBy ? String(obj.resolvedBy) : undefined,
    resolvedAt: obj.resolvedAt ? (obj.resolvedAt as Date).toISOString() : undefined,
    replies: (obj.replies ?? []).map((r) => ({
      id: String((r as { _id: Types.ObjectId })._id),
      commentId: String(obj._id),
      authorId: String(r.authorId),
      text: r.text,
      createdAt: (r.createdAt as Date).toISOString(),
      mentions: (r.mentions ?? []).map(String),
    })),
    mentions: (obj.mentions ?? []).map(String),
  };
}

function toTrackedChange(doc: HydratedDocument<TrackedChangeDoc>): TrackedChange {
  const obj = doc.toObject({ getters: true });
  return {
    id: String(obj._id),
    projectId: String(obj.projectId),
    fileId: String(obj.fileId),
    authorId: String(obj.authorId),
    type: obj.type as TrackedChange["type"],
    from: obj.from,
    to: obj.to,
    text: obj.text,
    status: (obj.status ?? "pending") as TrackedChange["status"],
    createdAt: (obj.createdAt as Date).toISOString(),
  };
}

function toChatMessage(doc: HydratedDocument<ChatMessageDoc>): ChatMessage {
  const obj = doc.toObject({ getters: true });
  return {
    id: String(obj._id),
    projectId: String(obj.projectId),
    authorId: String(obj.authorId),
    text: obj.text,
    createdAt: (obj.createdAt as Date).toISOString(),
    mentions: (obj.mentions ?? []).map(String),
  };
}

function toPresence(doc: HydratedDocument<PresenceDoc>): PresenceInfo {
  const obj = doc.toObject({ getters: true });
  return {
    userId: String(obj.userId),
    projectId: String(obj.projectId),
    fileId: obj.fileId ? String(obj.fileId) : null,
    cursorLine: obj.cursorLine ?? null,
    color: obj.color,
    lastActiveAt: (obj.lastActiveAt as Date).toISOString(),
  };
}

// Seeding (comments/track-changes/chat/presence) is reserved for this one
// demo project. It used to run for ANY project id passed in — meaning
// every real project got its own auto-generated set of canned demo
// comments/chat, which reads as "the same dummy chat in every account"
// even though each project technically got a separate copy. Real projects
// now stay genuinely empty until real activity happens in them.
const RICH_DEMO_PROJECT_ID = "proj_thesis";

function now(): string {
  return new Date().toISOString();
}

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString();
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 3_600_000).toISOString();
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

/**
 * File ownership for lib/mock-api/files.ts belongs to another agent, so mockDb.files may not be
 * seeded yet for this project (e.g. the user opened History/Chat before ever visiting the editor
 * tab). Read whatever is there; fall back to a plausible file reference otherwise.
 */
function projectFileRef(projectId: string): { fileId: string; path: string } {
  const file = mockDb.files.find(
    (f) => f.projectId === projectId && f.type === "file" && !f.isBinary
  );
  if (file) return { fileId: file.id, path: file.path };
  return { fileId: `file_main_${projectId}`, path: "/main.tex" };
}

function demoAuthors(projectId: string): string[] {
  const collabs = mockDb.collaborators.filter(
    (c) => c.projectId === projectId && c.userId !== CURRENT_USER_ID
  );
  if (collabs.length > 0) return collabs.map((c) => c.userId);
  return ["user_aditi", "user_marco"];
}

// ---------------------------------------------------------------------------
// Presence (mocked live cursors)
// ---------------------------------------------------------------------------

export async function listPresence(projectId: string): Promise<PresenceInfo[]> {
  if (isRealId(projectId)) {
    await getDb();
    await requireProjectAccess(projectId);
    // No real writer exists yet for this collection (no WebSocket/heartbeat
    // path — see the note on PresenceModel in lib/db/models/collaboration.ts,
    // real-time presence belongs in Redis/an ephemeral store in a real
    // deploy, this model exists mainly for schema completeness). Query it
    // honestly anyway: a recent row (last 2 minutes) is "present", anything
    // older is stale. Until something actually writes rows here this will
    // simply and correctly return [] for every real project.
    const recentCutoff = new Date(Date.now() - 2 * 60_000);
    const rows = await PresenceModel.find({ projectId, lastActiveAt: { $gte: recentCutoff } });
    return rows.map(toPresence);
  }

  seedMockDb();
  await delay(150);
  if (projectId !== RICH_DEMO_PROJECT_ID) return []; // no one is actually here — don't fake it
  const { fileId } = projectFileRef(projectId);
  return demoAuthors(projectId)
    .slice(0, 2)
    .map((userId, i) => ({
      userId,
      projectId,
      fileId,
      cursorLine: 12 + i * 9,
      color: i === 0 ? "#8b5cf6" : "#f59e0b",
      lastActiveAt: minutesAgo(i * 3 + 1),
    }));
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

const seededComments = new Set<string>();

function seedComments(projectId: string): void {
  if (projectId !== RICH_DEMO_PROJECT_ID) return;
  if (seededComments.has(projectId)) return;
  seededComments.add(projectId);
  // Defense in depth against a dev-server hot-reload resetting this
  // in-memory Set independently of the shared mockDb singleton, which would
  // otherwise silently re-push a duplicate copy of every seeded comment.
  if (mockDb.comments.some((c) => c.projectId === projectId)) return;

  const { fileId } = projectFileRef(projectId);
  const [a1, a2] = demoAuthors(projectId);
  const author1 = a1 ?? "user_aditi";
  const author2 = a2 ?? author1;

  const c1: Comment = {
    id: id("comment"),
    projectId,
    fileId,
    authorId: author1,
    anchorFrom: 0,
    anchorTo: 46,
    quotedText: "Foundational results on computability",
    text: "Should we cite the original 1936 paper here instead of the 1950 survey?",
    createdAt: daysAgo(2),
    resolved: false,
    replies: [
      {
        id: id("reply"),
        commentId: "",
        authorId: CURRENT_USER_ID,
        text: "Good catch — I'll swap it for the primary source.",
        createdAt: hoursAgo(20),
        mentions: [],
      },
    ],
    mentions: [],
  };
  c1.replies[0].commentId = c1.id;

  const c2: Comment = {
    id: id("comment"),
    projectId,
    fileId,
    authorId: author2,
    anchorFrom: 120,
    anchorTo: 168,
    quotedText: "the experimental setup described in",
    text: "Can you double-check this matches the setup in Section 3? It reads slightly differently there.",
    createdAt: hoursAgo(6),
    resolved: true,
    resolvedBy: CURRENT_USER_ID,
    resolvedAt: hoursAgo(2),
    replies: [],
    mentions: [],
  };

  mockDb.comments.push(c1, c2);
}

export async function listComments(projectId: string): Promise<Comment[]> {
  if (isRealId(projectId)) {
    await getDb();
    await requireProjectAccess(projectId);
    const rows = await CommentModel.find({ projectId }).sort({ createdAt: 1 });
    return rows.map(toComment);
  }

  seedMockDb();
  seedComments(projectId);
  await delay(20);
  return mockDb.comments
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createComment(
  projectId: string,
  fileId: string,
  input: { anchorFrom: number; anchorTo: number; quotedText: string; text: string; mentions: string[] }
): Promise<Comment> {
  if (isRealId(projectId)) {
    await getDb();
    const authorId = await requireProjectAccess(projectId);
    const created = await CommentModel.create({
      projectId,
      fileId,
      authorId,
      anchorFrom: input.anchorFrom,
      anchorTo: input.anchorTo,
      quotedText: input.quotedText,
      text: input.text,
      mentions: input.mentions,
    } as never);
    return toComment(created);
  }

  seedMockDb();
  await delay(350);
  const comment: Comment = {
    id: id("comment"),
    projectId,
    fileId,
    authorId: CURRENT_USER_ID,
    anchorFrom: input.anchorFrom,
    anchorTo: input.anchorTo,
    quotedText: input.quotedText,
    text: input.text,
    createdAt: now(),
    resolved: false,
    replies: [],
    mentions: input.mentions,
  };
  mockDb.comments.push(comment);
  return comment;
}

export async function replyToComment(
  commentId: string,
  text: string,
  mentions: string[]
): Promise<CommentReply> {
  if (isRealId(commentId)) {
    await getDb();
    const authorId = await requireProjectAccess(await projectIdForComment(commentId));
    const comment = await CommentModel.findById(commentId);
    if (!comment) throw new Error("Comment not found");
    comment.replies.push({ authorId, text, mentions } as never);
    await comment.save();
    const reply = comment.replies[comment.replies.length - 1] as HydratedDocument<CommentDoc>["replies"][number] & {
      _id: Types.ObjectId;
      createdAt: Date;
    };
    return {
      id: String(reply._id),
      commentId: String(comment._id),
      authorId: String(reply.authorId),
      text: reply.text,
      createdAt: reply.createdAt.toISOString(),
      mentions: (reply.mentions ?? []).map(String),
    };
  }

  await delay(300);
  const comment = mockDb.comments.find((c) => c.id === commentId);
  if (!comment) throw new Error("Comment not found");
  const reply: CommentReply = {
    id: id("reply"),
    commentId,
    authorId: CURRENT_USER_ID,
    text,
    createdAt: now(),
    mentions,
  };
  comment.replies.push(reply);
  return reply;
}

export async function resolveComment(commentId: string): Promise<void> {
  if (isRealId(commentId)) {
    await getDb();
    const resolvedBy = await requireProjectAccess(await projectIdForComment(commentId));
    await CommentModel.updateOne({ _id: commentId }, { resolved: true, resolvedBy, resolvedAt: new Date() });
    return;
  }

  await delay(200);
  const comment = mockDb.comments.find((c) => c.id === commentId);
  if (!comment) return;
  comment.resolved = true;
  comment.resolvedBy = CURRENT_USER_ID;
  comment.resolvedAt = now();
}

export async function reopenComment(commentId: string): Promise<void> {
  if (isRealId(commentId)) {
    await getDb();
    await requireProjectAccess(await projectIdForComment(commentId));
    await CommentModel.updateOne(
      { _id: commentId },
      { resolved: false, $unset: { resolvedBy: 1, resolvedAt: 1 } }
    );
    return;
  }

  await delay(200);
  const comment = mockDb.comments.find((c) => c.id === commentId);
  if (!comment) return;
  comment.resolved = false;
  comment.resolvedBy = undefined;
  comment.resolvedAt = undefined;
}

// ---------------------------------------------------------------------------
// Track changes
// ---------------------------------------------------------------------------

const seededChanges = new Set<string>();

function seedTrackedChanges(projectId: string): void {
  if (projectId !== RICH_DEMO_PROJECT_ID) return;
  if (seededChanges.has(projectId)) return;
  seededChanges.add(projectId);
  if (mockDb.trackedChanges.some((c) => c.projectId === projectId)) return;

  const { fileId } = projectFileRef(projectId);
  const [a1, a2] = demoAuthors(projectId);
  const author1 = a1 ?? "user_aditi";
  const author2 = a2 ?? author1;

  const rows: TrackedChange[] = [
    {
      id: id("change"),
      projectId,
      fileId,
      authorId: author1,
      type: "insertion",
      from: 180,
      to: 260,
      text: "our proposed method significantly outperforms all baselines by an average of 4.2 points",
      status: "pending",
      createdAt: hoursAgo(18),
    },
    {
      id: id("change"),
      projectId,
      fileId,
      authorId: author1,
      type: "deletion",
      from: 300,
      to: 344,
      text: "was found to work reasonably well in most cases",
      status: "pending",
      createdAt: hoursAgo(17),
    },
    {
      id: id("change"),
      projectId,
      fileId,
      authorId: author2,
      type: "insertion",
      from: 400,
      to: 448,
      text: "see Appendix B for the full derivation and proofs",
      status: "pending",
      createdAt: hoursAgo(9),
    },
    {
      id: id("change"),
      projectId,
      fileId,
      authorId: CURRENT_USER_ID,
      type: "deletion",
      from: 500,
      to: 528,
      text: "TODO: revisit this paragraph",
      status: "accepted",
      createdAt: daysAgo(3),
    },
  ];
  mockDb.trackedChanges.push(...rows);
}

export async function listTrackedChanges(projectId: string): Promise<TrackedChange[]> {
  if (isRealId(projectId)) {
    await getDb();
    await requireProjectAccess(projectId);
    const rows = await TrackedChangeModel.find({ projectId }).sort({ createdAt: 1 });
    return rows.map(toTrackedChange);
  }

  seedMockDb();
  seedTrackedChanges(projectId);
  await delay(250);
  return mockDb.trackedChanges
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function acceptChange(changeId: string): Promise<void> {
  if (isRealId(changeId)) {
    await getDb();
    await requireProjectAccess(await projectIdForChange(changeId));
    await TrackedChangeModel.updateOne({ _id: changeId }, { status: "accepted" });
    return;
  }
  await delay(200);
  const change = mockDb.trackedChanges.find((c) => c.id === changeId);
  if (change) change.status = "accepted";
}

export async function rejectChange(changeId: string): Promise<void> {
  if (isRealId(changeId)) {
    await getDb();
    await requireProjectAccess(await projectIdForChange(changeId));
    await TrackedChangeModel.updateOne({ _id: changeId }, { status: "rejected" });
    return;
  }
  await delay(200);
  const change = mockDb.trackedChanges.find((c) => c.id === changeId);
  if (change) change.status = "rejected";
}

export async function acceptAllByUser(projectId: string, userId: string): Promise<void> {
  if (isRealId(projectId)) {
    await getDb();
    await requireProjectAccess(projectId);
    await TrackedChangeModel.updateMany({ projectId, authorId: userId, status: "pending" }, { status: "accepted" });
    return;
  }
  await delay(300);
  for (const c of mockDb.trackedChanges) {
    if (c.projectId === projectId && c.authorId === userId && c.status === "pending") {
      c.status = "accepted";
    }
  }
}

export async function rejectAllByUser(projectId: string, userId: string): Promise<void> {
  if (isRealId(projectId)) {
    await getDb();
    await requireProjectAccess(projectId);
    await TrackedChangeModel.updateMany({ projectId, authorId: userId, status: "pending" }, { status: "rejected" });
    return;
  }
  await delay(300);
  for (const c of mockDb.trackedChanges) {
    if (c.projectId === projectId && c.authorId === userId && c.status === "pending") {
      c.status = "rejected";
    }
  }
}

export async function acceptAllChanges(projectId: string): Promise<void> {
  if (isRealId(projectId)) {
    await getDb();
    await requireProjectAccess(projectId);
    await TrackedChangeModel.updateMany({ projectId, status: "pending" }, { status: "accepted" });
    return;
  }
  await delay(300);
  for (const c of mockDb.trackedChanges) {
    if (c.projectId === projectId && c.status === "pending") c.status = "accepted";
  }
}

export async function rejectAllChanges(projectId: string): Promise<void> {
  if (isRealId(projectId)) {
    await getDb();
    await requireProjectAccess(projectId);
    await TrackedChangeModel.updateMany({ projectId, status: "pending" }, { status: "rejected" });
    return;
  }
  await delay(300);
  for (const c of mockDb.trackedChanges) {
    if (c.projectId === projectId && c.status === "pending") c.status = "rejected";
  }
}

// ---------------------------------------------------------------------------
// Project chat
// ---------------------------------------------------------------------------

const seededChat = new Set<string>();

function seedChat(projectId: string): void {
  if (projectId !== RICH_DEMO_PROJECT_ID) return;
  if (seededChat.has(projectId)) return;
  seededChat.add(projectId);
  if (mockDb.chatMessages.some((m) => m.projectId === projectId)) return;

  const [a1] = demoAuthors(projectId);
  const author1 = a1 ?? "user_aditi";

  mockDb.chatMessages.push(
    {
      id: id("chat"),
      projectId,
      authorId: author1,
      text: "Pushed a first pass at the related work section — take a look when you get a chance.",
      createdAt: hoursAgo(5),
      mentions: [],
    },
    {
      id: id("chat"),
      projectId,
      authorId: CURRENT_USER_ID,
      text: "Will do, thanks! Compiling now to check the references render correctly.",
      createdAt: hoursAgo(4),
      mentions: [],
    }
  );
}

export async function listChatMessages(projectId: string): Promise<ChatMessage[]> {
  if (isRealId(projectId)) {
    await getDb();
    await requireProjectAccess(projectId);
    const rows = await ChatMessageModel.find({ projectId }).sort({ createdAt: 1 });
    return rows.map(toChatMessage);
  }

  seedMockDb();
  seedChat(projectId);
  await delay(20);
  return mockDb.chatMessages
    .filter((m) => m.projectId === projectId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function sendChatMessage(
  projectId: string,
  text: string,
  mentions: string[]
): Promise<ChatMessage> {
  if (isRealId(projectId)) {
    await getDb();
    const authorId = await requireProjectAccess(projectId);
    const created = await ChatMessageModel.create({ projectId, authorId, text, mentions } as never);
    return toChatMessage(created);
  }

  await delay(300);
  const message: ChatMessage = {
    id: id("chat"),
    projectId,
    authorId: CURRENT_USER_ID,
    text,
    createdAt: now(),
    mentions,
  };
  mockDb.chatMessages.push(message);
  return message;
}

// ---------------------------------------------------------------------------
// Share / permissions
// ---------------------------------------------------------------------------

export async function listCollaborators(
  projectId: string
): Promise<Array<Collaborator & { user: User }>> {
  if (isRealId(projectId)) {
    await getDb();
    await requireProjectAccess(projectId);
    const project = await ProjectModel.findById(projectId).select("ownerId createdAt");
    if (!project) return [];
    const rows = await CollaboratorModel.find({ projectId });
    const userIds = [...new Set([String(project.ownerId), ...rows.map((r) => String(r.userId))])];
    const users = await UserModel.find({ _id: { $in: userIds } });
    const userById = new Map(users.map((u) => [String(u._id), toUser(u)]));

    const joined: Array<Collaborator & { user: User }> = [];
    const ownerUser = userById.get(String(project.ownerId));
    if (ownerUser) {
      joined.push({
        userId: ownerUser.id,
        projectId,
        role: "owner",
        addedAt: (project.createdAt as Date).toISOString(),
        user: ownerUser,
      });
    }
    for (const r of rows) {
      const u = userById.get(String(r.userId));
      if (!u) continue;
      joined.push({
        userId: u.id,
        projectId,
        role: r.role as Role,
        invitedEmail: r.invitedEmail ?? undefined,
        addedAt: (r.addedAt as Date).toISOString(),
        user: u,
      });
    }
    return joined;
  }

  seedMockDb();
  await delay(300);
  const project = mockDb.projects.find((p) => p.id === projectId);
  const rows = mockDb.collaborators.filter((c) => c.projectId === projectId);
  const hasOwnerRow = project ? rows.some((r) => r.userId === project.ownerId) : true;

  const allRows: Collaborator[] =
    project && !hasOwnerRow
      ? [
          { userId: project.ownerId, projectId, role: "owner", addedAt: project.createdAt },
          ...rows,
        ]
      : rows;

  const joined: Array<Collaborator & { user: User }> = [];
  for (const c of allRows) {
    const user = mockDb.users.find((u) => u.id === c.userId);
    if (user) joined.push({ ...c, user });
  }
  return joined;
}

export async function inviteCollaborator(
  projectId: string,
  email: string,
  role: Role
): Promise<Collaborator> {
  if (isRealId(projectId)) {
    await getDb();
    // Owner-only: inviting is collaborator management, same bucket as
    // role changes/removal/ownership transfer below.
    await requireProjectAccess(projectId, "owner");
    const project = await ProjectModel.findById(projectId).select("ownerId");
    if (!project) throw new Error(`Project not found: ${projectId}`);

    let user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Not a registered account yet — create a placeholder the same way
      // the mock path always has: they gain real access the moment they
      // sign up/log in with this email, no separate "pending invite" table.
      user = await UserModel.create({
        name: email.split("@")[0].replace(/[._-]/g, " ") || email,
        email,
      });
    }
    if (String(project.ownerId) === String(user._id)) {
      throw new Error("This person already owns the project.");
    }

    // CollaboratorModel's `addedAt` timestamp alias confuses Mongoose's
    // generated filter/create overloads (same friction already worked
    // around with `as never` elsewhere in lib/mock-api/projects.ts) —
    // the runtime shape is correct, only the overload resolution isn't.
    const existing = await CollaboratorModel.findOne({ projectId, userId: user._id } as never);
    if (existing) {
      const existingDoc = existing as unknown as { role: Role; addedAt: Date; save: () => Promise<unknown> };
      existingDoc.role = role;
      await existingDoc.save();
      return {
        userId: String(user._id),
        projectId,
        role,
        invitedEmail: email,
        addedAt: existingDoc.addedAt.toISOString(),
      };
    }

    const collaboratorCount = await CollaboratorModel.countDocuments({ projectId });
    // +1 for the owner, +1 for the person being invited right now.
    if (collaboratorCount + 2 > MAX_COLLABORATORS_PER_PROJECT) {
      throw new Error(
        `This project already has ${MAX_COLLABORATORS_PER_PROJECT} people (the maximum) — remove someone before inviting another.`
      );
    }

    const created = (await CollaboratorModel.create({
      projectId,
      userId: user._id,
      role,
      invitedEmail: email,
    } as never)) as unknown as { addedAt: Date };
    return {
      userId: String(user._id),
      projectId,
      role,
      invitedEmail: email,
      addedAt: created.addedAt.toISOString(),
    };
  }

  seedMockDb();
  await delay(400);

  let user = mockDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    user = {
      id: id("user"),
      name: email.split("@")[0].replace(/[._-]/g, " ") || email,
      email,
      createdAt: now(),
      twoFactorEnabled: false,
      linkedAccounts: [],
      editorDefaults: {
        keybinding: "default",
        theme: "default",
        fontSize: 14,
        tabSize: 2,
        autocomplete: true,
        wordWrap: true,
        lineNumbers: true,
      },
      planTier: "free",
      storageQuotaBytes: 1024 * 1024 * 1024,
      storageUsedBytes: 0,
    };
    mockDb.users.push(user);
  }

  const existing = mockDb.collaborators.find(
    (c) => c.projectId === projectId && c.userId === user!.id
  );
  if (existing) {
    existing.role = role;
    return existing;
  }

  const collaborator: Collaborator = {
    userId: user.id,
    projectId,
    role,
    invitedEmail: email,
    addedAt: now(),
  };
  mockDb.collaborators.push(collaborator);
  return collaborator;
}

export async function updateCollaboratorRole(
  projectId: string,
  userId: string,
  role: Role
): Promise<void> {
  if (isRealId(projectId)) {
    await getDb();
    // SECURITY FIX: this used to accept whatever {projectId, userId, role}
    // the client sent with no check at all — any signed-in collaborator
    // (including a "viewer") could promote/demote *any other* collaborator,
    // which is exactly the privilege-escalation bug this fix closes.
    await requireProjectAccess(projectId, "owner");
    // "owner" isn't a role a collaborator row can hold (the owner is
    // tracked on the project itself, see transferOwnership) — routing a
    // grant of it through here instead of transferOwnership would leave the
    // project with two "owners" and an inconsistent ProjectModel.ownerId.
    if (role === "owner") {
      throw new Error("Use transferOwnership to make someone else the owner.");
    }
    await CollaboratorModel.updateOne({ projectId, userId }, { role });
    return;
  }
  await delay(250);
  const collaborator = mockDb.collaborators.find(
    (c) => c.projectId === projectId && c.userId === userId
  );
  if (collaborator) collaborator.role = role;
}

export async function removeCollaborator(projectId: string, userId: string): Promise<void> {
  if (isRealId(projectId)) {
    await getDb();
    // SECURITY FIX: same missing check as updateCollaboratorRole — any
    // collaborator could remove any other collaborator. Fixed the same way,
    // except a user removing *themselves* (leaving the project) is always
    // allowed regardless of role — see requireOwnerOrSelf's own comment.
    await requireOwnerOrSelf(projectId, userId);
    await CollaboratorModel.deleteOne({ projectId, userId });
    return;
  }
  await delay(250);
  mockDb.collaborators = mockDb.collaborators.filter(
    (c) => !(c.projectId === projectId && c.userId === userId)
  );
}

export async function transferOwnership(projectId: string, newOwnerId: string): Promise<void> {
  if (isRealId(projectId)) {
    await getDb();
    const callerId = await requireUserId();
    const project = await ProjectModel.findById(projectId).select("ownerId");
    if (!project) return;
    // SECURITY FIX: this used to let *any* caller reassign ownership of any
    // project to anyone — the most severe instance of the missing-check bug,
    // since it hands over full control including the ability to remove the
    // real owner afterward. Only the current owner may transfer.
    if (String(project.ownerId) !== callerId) {
      throw new Error("Not authorized: only the project owner can transfer ownership");
    }
    const previousOwnerId = String(project.ownerId);
    if (previousOwnerId === newOwnerId) return;

    project.ownerId = newOwnerId as never;
    await project.save();

    // The owner never gets an explicit CollaboratorModel row (see the
    // model's own comment — implicit access), so becoming owner means
    // dropping any existing row for them, and the previous owner needs one
    // added now that their access is no longer implicit.
    await CollaboratorModel.deleteOne({ projectId, userId: newOwnerId } as never);
    const existingPrevious = await CollaboratorModel.findOne({ projectId, userId: previousOwnerId } as never);
    if (existingPrevious) {
      const doc = existingPrevious as unknown as { role: Role; save: () => Promise<unknown> };
      doc.role = "editor";
      await doc.save();
    } else {
      await CollaboratorModel.create({ projectId, userId: previousOwnerId, role: "editor" } as never);
    }
    return;
  }

  seedMockDb();
  await delay(400);
  const project = mockDb.projects.find((p) => p.id === projectId);
  if (!project) return;

  const previousOwnerId = project.ownerId;
  project.ownerId = newOwnerId;

  const newOwnerRow = mockDb.collaborators.find(
    (c) => c.projectId === projectId && c.userId === newOwnerId
  );
  if (newOwnerRow) newOwnerRow.role = "owner";
  else mockDb.collaborators.push({ userId: newOwnerId, projectId, role: "owner", addedAt: now() });

  if (previousOwnerId !== newOwnerId) {
    const previousOwnerRow = mockDb.collaborators.find(
      (c) => c.projectId === projectId && c.userId === previousOwnerId
    );
    if (previousOwnerRow) previousOwnerRow.role = "editor";
    else
      mockDb.collaborators.push({
        userId: previousOwnerId,
        projectId,
        role: "editor",
        addedAt: now(),
      });
  }
}

export async function setProjectVisibility(
  projectId: string,
  visibility: "private" | "public"
): Promise<{ publicReadOnlyLink: string | null }> {
  if (isRealId(projectId)) {
    await getDb();
    // Owner-only, same bucket as invite/role-change/remove/transfer: this
    // toggles whether the whole project is publicly reachable, which is a
    // project-wide exposure decision, not routine collaborator activity.
    // (The Share dialog's public-access Switch had no isOwner gate either —
    // same UI bug class as the role dropdown — fixed alongside it.)
    await requireProjectAccess(projectId, "owner");
    const project = await ProjectModel.findById(projectId).select("visibility publicReadOnlyLink");
    if (!project) return { publicReadOnlyLink: null };
    project.visibility = visibility;
    if (visibility === "public") {
      // A path, not a full URL — this server-side code has no reliable way
      // to know its own deployed domain (dev vs. a real Vercel URL), and a
      // wrong hardcoded one is worse than a relative link the client
      // resolves against window.location.origin itself (see share-button.tsx).
      // NOTE: there is no actual public-view page at this path yet (no
      // app/r/[token]/ route exists) — this makes the toggle/link state
      // persist correctly, but visiting the link 404s until that page is
      // built. Flagged to the project owner rather than silently shipping
      // a link that looks like a real feature.
      project.publicReadOnlyLink =
        project.publicReadOnlyLink ?? `/r/${projectId}-${Math.random().toString(36).slice(2, 8)}`;
    } else {
      project.publicReadOnlyLink = null;
    }
    await project.save();
    return { publicReadOnlyLink: project.publicReadOnlyLink };
  }

  seedMockDb();
  await delay(300);
  const project = mockDb.projects.find((p) => p.id === projectId);
  if (!project) return { publicReadOnlyLink: null };

  project.visibility = visibility;
  if (visibility === "public") {
    project.publicReadOnlyLink =
      project.publicReadOnlyLink ?? `/r/${projectId}-${Math.random().toString(36).slice(2, 8)}`;
  } else {
    project.publicReadOnlyLink = null;
  }
  return { publicReadOnlyLink: project.publicReadOnlyLink };
}
