"use server";

// Aggregators for the project dashboard, now scoped to the real logged-in
// user's real (MongoDB) projects instead of a hardcoded demo project id.
// This is precisely the fix for "every new user sees the same activity/
// inbox" — that data is only ever built from projects this specific
// session's user actually owns or collaborates on.
//
// Comments/versions/chat/references themselves are not migrated to MongoDB
// yet (still Phase 1's in-memory mock, see lib/mock-api/{collaboration,
// history,references}.ts) — for a brand-new real project those will
// legitimately be empty until that migration happens too, which is the
// honest state to show rather than borrowing another project's content.

import { getDb } from "@/lib/db/mongoose";
import { ProjectModel, CollaboratorModel, ProjectFileModel } from "@/lib/db/models/project";
import { requireUserId } from "@/lib/db/require-user";
import { mockDb } from "@/lib/mock-api/db";
import {
  detectBrokenReferences,
  detectDuplicateKeys,
  getReferencesFile,
} from "@/lib/mock-api/references";
import { listChatMessages, listComments } from "@/lib/mock-api/collaboration";
import { listVersions } from "@/lib/mock-api/history";
import { listSavedPapers } from "@/lib/mock-api/research";

async function ownedOrSharedProjectIds(userId: string): Promise<string[]> {
  const [owned, shared] = await Promise.all([
    ProjectModel.find({ ownerId: userId, trashed: false }).select("_id"),
    CollaboratorModel.find({ userId }).select("projectId"),
  ]);
  return [...owned.map((p) => String(p._id)), ...shared.map((c) => String(c.projectId))];
}

// ---------------------------------------------------------------------------
// Per-project dashboard stats (rich project cards)
// ---------------------------------------------------------------------------

export interface ProjectDashboardStats {
  /** Real: 0 until a "% written" concept is tracked; no more fabricated numbers for real projects. */
  progressPercent: number;
  /** Real count of .bib entries filed under the project, where a .bib file has actually been opened/seeded client-side. */
  referenceCount: number;
  /** Real count of image files under the project. */
  figureCount: number;
  /** First image file's thumbnail, if one exists — null until real object
   * storage (TASKS.md Phase 2.3) actually backs uploaded image bytes with a
   * real thumbnailUrl; wired now so the card lights up the moment it does,
   * rather than showing a fabricated image in the meantime. */
  thumbnailUrl: string | null;
  /** Real: MongoDB collaborator rows for the project (+1 for the owner, always). */
  collaboratorCount: number;
}

const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;

function referenceCountFor(projectId: string): number {
  const bibFileIds = mockDb.files
    .filter((f) => f.projectId === projectId && f.name.toLowerCase().endsWith(".bib"))
    .map((f) => f.id);
  if (bibFileIds.length === 0) return 0;
  return mockDb.bibEntries.filter((e) => bibFileIds.includes(e.fileId)).length;
}

/** Images for a real project live in MongoDB (uploaded via the real file
 * tree), never in mockDb.files — this used to only check mockDb.files, so
 * figureCount silently read 0 for every real project regardless of how many
 * images it actually had. */
async function figuresFor(projectId: string): Promise<{ count: number; firstThumbnailUrl: string | null }> {
  if (OBJECT_ID_RE.test(projectId)) {
    const images = await ProjectFileModel.find({
      projectId,
      isBinary: true,
      mimeType: { $regex: "^image/" },
    })
      .sort({ createdAt: 1 })
      .select("thumbnailUrl")
      .lean();
    return { count: images.length, firstThumbnailUrl: images[0]?.thumbnailUrl ?? null };
  }
  const images = mockDb.files.filter(
    (f) => f.projectId === projectId && f.isBinary && (f.mimeType?.startsWith("image/") ?? false),
  );
  return { count: images.length, firstThumbnailUrl: images[0]?.thumbnailUrl ?? null };
}

export async function listProjectDashboardStats(
  projectIds: string[],
): Promise<Record<string, ProjectDashboardStats>> {
  await getDb();

  const collaboratorCounts = await CollaboratorModel.aggregate<{ _id: string; count: number }>([
    { $match: { projectId: { $in: projectIds } } },
    { $group: { _id: "$projectId", count: { $sum: 1 } } },
  ]);
  const collabMap = new Map(collaboratorCounts.map((c) => [String(c._id), c.count]));

  const result: Record<string, ProjectDashboardStats> = {};
  for (const projectId of projectIds) {
    const figures = await figuresFor(projectId);
    result[projectId] = {
      progressPercent: 0,
      referenceCount: referenceCountFor(projectId),
      figureCount: figures.count,
      thumbnailUrl: figures.firstThumbnailUrl,
      collaboratorCount: 1 + (collabMap.get(projectId) ?? 0), // +1 for the owner
    };
  }
  return result;
}

// ---------------------------------------------------------------------------
// Recent activity panel
// ---------------------------------------------------------------------------

export type ActivityKind = "comment" | "reply" | "version" | "chat" | "compile";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  text: string;
  projectId: string;
  projectName: string;
  createdAt: string;
}

export async function getRecentActivity(limit = 6): Promise<ActivityItem[]> {
  await getDb();
  const userId = await requireUserId();
  const projectIds = await ownedOrSharedProjectIds(userId);
  if (projectIds.length === 0) return [];

  const projects = await ProjectModel.find({ _id: { $in: projectIds } }).select("name");
  const nameById = new Map(projects.map((p) => [String(p._id), p.name]));

  // Each of these mock-layer reads carries an artificial network-latency
  // delay left over from the Phase 1 UI-only prototype (150-500ms apiece).
  // Fetching one project at a time in a sequential for-loop meant total
  // dashboard load time scaled linearly with project count (N projects x
  // ~3 sequential-looking delays each) - this is what made the dashboard
  // "very slow" for any account with more than one or two projects. Fetch
  // every project's activity in parallel instead: the whole page now costs
  // roughly one project's worth of latency, not the sum of all of them.
  const perProject = await Promise.all(
    projectIds.map(async (projectId) => {
      const projectName = nameById.get(projectId) ?? "your project";
      const [comments, versions, chat] = await Promise.all([
        listComments(projectId),
        listVersions(projectId),
        listChatMessages(projectId),
      ]);

      const projectItems: ActivityItem[] = [];
      for (const c of comments) {
        projectItems.push({
          id: `comment-${c.id}`,
          kind: "comment",
          text: `Comment: "${c.text.slice(0, 72)}"`,
          projectId,
          projectName,
          createdAt: c.createdAt,
        });
        for (const reply of c.replies) {
          projectItems.push({
            id: `reply-${reply.id}`,
            kind: "reply",
            text: `Reply: "${reply.text.slice(0, 72)}"`,
            projectId,
            projectName,
            createdAt: reply.createdAt,
          });
        }
      }
      for (const v of versions) {
        if (!v.label) continue;
        projectItems.push({
          id: `version-${v.id}`,
          kind: "version",
          text: `Saved version "${v.label}"`,
          projectId,
          projectName,
          createdAt: v.createdAt,
        });
      }
      for (const m of chat) {
        projectItems.push({
          id: `chat-${m.id}`,
          kind: "chat",
          text: `Chat: "${m.text.slice(0, 72)}"`,
          projectId,
          projectName,
          createdAt: m.createdAt,
        });
      }
      return projectItems;
    }),
  );

  const items: ActivityItem[] = perProject.flat();

  for (const compile of mockDb.compiles) {
    if (compile.status !== "success" || !compile.finishedAt || !projectIds.includes(compile.projectId)) continue;
    const durationMs =
      compile.durationMs ??
      (compile.startedAt ? Date.parse(compile.finishedAt) - Date.parse(compile.startedAt) : undefined);
    items.push({
      id: `compile-${compile.id}`,
      kind: "compile",
      text: `Build completed${durationMs ? ` in ${(durationMs / 1000).toFixed(2)}s` : ""}`,
      projectId: compile.projectId,
      projectName: nameById.get(compile.projectId) ?? "a project",
      createdAt: compile.finishedAt,
    });
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return items.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Research inbox panel
// ---------------------------------------------------------------------------

export interface InboxItem {
  id: string;
  text: string;
  count: number;
  projectId: string;
  tone: "default" | "warning" | "error";
}

export async function getResearchInbox(): Promise<InboxItem[]> {
  await getDb();
  const userId = await requireUserId();
  const projectIds = await ownedOrSharedProjectIds(userId);
  if (projectIds.length === 0) return [];

  const firstProjectId = projectIds[0];

  // Same fix as getRecentActivity above: fetch every project's inbox signals
  // in parallel instead of one project at a time, since each read here also
  // carries a Phase-1-era artificial mock delay.
  const perProject = await Promise.all(
    projectIds.map(async (projectId) => {
      const [papers, comments] = await Promise.all([listSavedPapers(projectId), listComments(projectId)]);
      const file = await getReferencesFile(projectId).catch(() => null);
      const [duplicateKeys, broken] = file
        ? await Promise.all([detectDuplicateKeys(file.id), detectBrokenReferences(projectId)])
        : [[] as Awaited<ReturnType<typeof detectDuplicateKeys>>, { undefinedCites: [], unusedEntries: [] }];
      return {
        papers: papers.length,
        needsReview: papers.filter((p) => p.needsReview).length,
        unresolvedComments: comments.filter((c) => !c.resolved).length,
        duplicates: duplicateKeys.length,
        broken: broken.undefinedCites.length,
      };
    }),
  );

  let totalPapers = 0;
  let totalNeedsReview = 0;
  let totalUnresolvedComments = 0;
  let totalBroken = 0;
  let totalDuplicates = 0;
  for (const p of perProject) {
    totalPapers += p.papers;
    totalNeedsReview += p.needsReview;
    totalUnresolvedComments += p.unresolvedComments;
    totalBroken += p.broken;
    totalDuplicates += p.duplicates;
  }

  const items: InboxItem[] = [];
  if (totalPapers > 0) {
    items.push({
      id: "papers-saved",
      text: `paper${totalPapers === 1 ? "" : "s"} saved`,
      count: totalPapers,
      projectId: firstProjectId,
      tone: "default",
    });
  }
  if (totalNeedsReview > 0) {
    items.push({
      id: "papers-awaiting-review",
      text: `paper${totalNeedsReview === 1 ? "" : "s"} awaiting review`,
      count: totalNeedsReview,
      projectId: firstProjectId,
      tone: "default",
    });
  }
  if (totalBroken > 0) {
    items.push({
      id: "broken-refs",
      text: `citation${totalBroken === 1 ? "" : "s"} need verification`,
      count: totalBroken,
      projectId: firstProjectId,
      tone: "warning",
    });
  }
  if (totalUnresolvedComments > 0) {
    items.push({
      id: "unresolved-comments",
      text: `comment${totalUnresolvedComments === 1 ? "" : "s"} waiting for a reply`,
      count: totalUnresolvedComments,
      projectId: firstProjectId,
      tone: "default",
    });
  }
  if (totalDuplicates > 0) {
    items.push({
      id: "duplicate-keys",
      text: `bibliography conflict${totalDuplicates === 1 ? "" : "s"}`,
      count: totalDuplicates,
      projectId: firstProjectId,
      tone: "error",
    });
  }
  return items;
}
