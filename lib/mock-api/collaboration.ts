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
  await delay(200);
  const comment = mockDb.comments.find((c) => c.id === commentId);
  if (!comment) return;
  comment.resolved = true;
  comment.resolvedBy = CURRENT_USER_ID;
  comment.resolvedAt = now();
}

export async function reopenComment(commentId: string): Promise<void> {
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
  seedMockDb();
  seedTrackedChanges(projectId);
  await delay(250);
  return mockDb.trackedChanges
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function acceptChange(changeId: string): Promise<void> {
  await delay(200);
  const change = mockDb.trackedChanges.find((c) => c.id === changeId);
  if (change) change.status = "accepted";
}

export async function rejectChange(changeId: string): Promise<void> {
  await delay(200);
  const change = mockDb.trackedChanges.find((c) => c.id === changeId);
  if (change) change.status = "rejected";
}

export async function acceptAllByUser(projectId: string, userId: string): Promise<void> {
  await delay(300);
  for (const c of mockDb.trackedChanges) {
    if (c.projectId === projectId && c.authorId === userId && c.status === "pending") {
      c.status = "accepted";
    }
  }
}

export async function rejectAllByUser(projectId: string, userId: string): Promise<void> {
  await delay(300);
  for (const c of mockDb.trackedChanges) {
    if (c.projectId === projectId && c.authorId === userId && c.status === "pending") {
      c.status = "rejected";
    }
  }
}

export async function acceptAllChanges(projectId: string): Promise<void> {
  await delay(300);
  for (const c of mockDb.trackedChanges) {
    if (c.projectId === projectId && c.status === "pending") c.status = "accepted";
  }
}

export async function rejectAllChanges(projectId: string): Promise<void> {
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
  await delay(250);
  const collaborator = mockDb.collaborators.find(
    (c) => c.projectId === projectId && c.userId === userId
  );
  if (collaborator) collaborator.role = role;
}

export async function removeCollaborator(projectId: string, userId: string): Promise<void> {
  await delay(250);
  mockDb.collaborators = mockDb.collaborators.filter(
    (c) => !(c.projectId === projectId && c.userId === userId)
  );
}

export async function transferOwnership(projectId: string, newOwnerId: string): Promise<void> {
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
  seedMockDb();
  await delay(300);
  const project = mockDb.projects.find((p) => p.id === projectId);
  if (!project) return { publicReadOnlyLink: null };

  project.visibility = visibility;
  if (visibility === "public") {
    project.publicReadOnlyLink =
      project.publicReadOnlyLink ?? `https://inkwell.app/r/${projectId}-${Math.random().toString(36).slice(2, 8)}`;
  } else {
    project.publicReadOnlyLink = null;
  }
  return { publicReadOnlyLink: project.publicReadOnlyLink };
}
