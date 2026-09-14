"use server";

// Real per-user project list, backed by MongoDB — replaces the Phase 1 mock
// that filtered against a hardcoded CURRENT_USER_ID constant (so every
// browser saw the same seeded demo projects regardless of who "signed up").
// Signatures unchanged from the mock so no calling component needed edits.

import type { Project } from "@/lib/types";
import { getDb } from "@/lib/db/mongoose";
import { ProjectModel, CollaboratorModel, type ProjectDoc } from "@/lib/db/models/project";
import { UserModel } from "@/lib/db/models/user";
import { requireUserId } from "@/lib/db/require-user";
import type { HydratedDocument } from "mongoose";
import { uploadBinaryFile } from "@/lib/storage/blob-storage";

export type ProjectSortField = "name" | "updatedAt" | "createdAt" | "owner";
export type SortOrder = "asc" | "desc";

export interface ListProjectsQuery {
  search?: string;
  tag?: string;
  sort?: ProjectSortField;
  order?: SortOrder;
  trashed?: boolean;
  archived?: boolean;
}

function toProject(doc: HydratedDocument<ProjectDoc>): Project {
  const obj = doc.toObject({ getters: true });
  return {
    id: String(obj._id),
    name: obj.name,
    ownerId: String(obj.ownerId),
    folderId: obj.folderId ? String(obj.folderId) : null,
    tags: obj.tags ?? [],
    starred: obj.starred,
    archived: obj.archived,
    trashed: obj.trashed,
    trashedAt: obj.trashedAt ? new Date(obj.trashedAt).toISOString() : null,
    createdAt: new Date(obj.createdAt as Date).toISOString(),
    updatedAt: new Date(obj.updatedAt as Date).toISOString(),
    settings: {
      compiler: obj.settings.compiler,
      texLiveVersion: obj.settings.texLiveVersion,
      mainFileId: obj.settings.mainFileId ? String(obj.settings.mainFileId) : null,
      spellCheckLanguage: obj.settings.spellCheckLanguage,
      autoCompile: obj.settings.autoCompile,
      compileTimeoutSeconds: obj.settings.compileTimeoutSeconds,
      draftMode: obj.settings.draftMode,
      shellEscape: obj.settings.shellEscape,
      customCompileCommand: obj.settings.customCompileCommand ?? undefined,
    },
    storageUsedBytes: obj.storageUsedBytes,
    visibility: obj.visibility,
    publicReadOnlyLink: obj.publicReadOnlyLink ?? null,
    sourceTemplateId: obj.sourceTemplateId ? String(obj.sourceTemplateId) : undefined,
    sourceImport: obj.sourceImport
      ? { kind: obj.sourceImport.kind!, origin: obj.sourceImport.origin! }
      : undefined,
  };
}

async function requireOwnedProject(projectId: string): Promise<HydratedDocument<ProjectDoc>> {
  const userId = await requireUserId();
  const project = await ProjectModel.findOne({ _id: projectId, ownerId: userId });
  if (!project) throw new Error(`Project not found: ${projectId}`);
  return project;
}

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Permanently deletes any of this user's own trashed projects older than
 * the 30-day retention window. There's no real background job/cron in this
 * environment, so this runs as a lazy check-on-access instead — the same
 * approach as a real cron would produce (rows past the cutoff get deleted),
 * just triggered by the next listProjects() call instead of a schedule.
 * Only the owner's own projects are purged here, matching
 * permanentlyDeleteProject's ownership scoping.
 */
async function purgeExpiredTrash(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - TRASH_RETENTION_MS);
  const expired = await ProjectModel.find({ ownerId: userId, trashed: true, trashedAt: { $lte: cutoff } }).select(
    "_id"
  );
  if (expired.length === 0) return;
  const ids = expired.map((p) => p._id);
  await ProjectModel.deleteMany({ _id: { $in: ids } } as never);
  await CollaboratorModel.deleteMany({ projectId: { $in: ids } } as never);
}

export async function listProjects(query: ListProjectsQuery = {}): Promise<Project[]> {
  await getDb();
  const userId = await requireUserId();
  await purgeExpiredTrash(userId);

  const collaboratorRows = await CollaboratorModel.find({ userId }).select("projectId").lean();
  const collaboratorProjectIds = collaboratorRows.map((r) => r.projectId);

  const wantTrashed = query.trashed ?? false;
  const filter: Record<string, unknown> = {
    $or: [{ ownerId: userId }, { _id: { $in: collaboratorProjectIds } }],
    trashed: wantTrashed,
  };
  if (!wantTrashed) {
    filter.archived = query.archived ?? false;
  }
  if (query.search?.trim()) {
    filter.name = { $regex: query.search.trim(), $options: "i" };
  }
  if (query.tag) {
    filter.tags = query.tag;
  }

  const docs = await ProjectModel.find(filter as never);
  let results = docs.map(toProject);

  const ownerLabel = (p: Project) => (p.ownerId === userId ? "" : p.ownerId);
  const sort = query.sort ?? "updatedAt";
  const order = query.order ?? (sort === "name" || sort === "owner" ? "asc" : "desc");
  const dir = order === "asc" ? 1 : -1;

  results = [...results].sort((a, b) => {
    switch (sort) {
      case "name":
        return a.name.localeCompare(b.name) * dir;
      case "owner":
        return ownerLabel(a).localeCompare(ownerLabel(b)) * dir;
      case "createdAt":
        return (Date.parse(a.createdAt) - Date.parse(b.createdAt)) * dir;
      case "updatedAt":
      default:
        return (Date.parse(a.updatedAt) - Date.parse(b.updatedAt)) * dir;
    }
  });

  return results;
}

export async function getProject(projectId: string): Promise<Project> {
  await getDb();
  const userId = await requireUserId();
  const isCollaborator = await CollaboratorModel.exists({ projectId, userId });
  const project = await ProjectModel.findOne(
    isCollaborator ? { _id: projectId } : { _id: projectId, ownerId: userId },
  );
  if (!project) throw new Error(`Project not found: ${projectId}`);
  return toProject(project);
}

export async function updateProject(
  projectId: string,
  patch: Partial<Pick<Project, "name" | "tags" | "starred" | "folderId">>,
): Promise<Project> {
  await getDb();
  const project = await requireOwnedProject(projectId);
  if (patch.name !== undefined) project.name = patch.name;
  if (patch.tags !== undefined) project.tags = patch.tags;
  if (patch.starred !== undefined) project.starred = patch.starred;
  if (patch.folderId !== undefined) project.folderId = patch.folderId as never;
  await project.save();
  return toProject(project);
}

/** A user-chosen cover image for the dashboard card, distinct from (and
 * taking priority over) the auto-picked "first figure in the project"
 * fallback in lib/mock-api/dashboard.ts. `base64` is the raw image bytes,
 * base64-encoded (same convention as UploadFileInput/ZipImportEntry). */
export async function setProjectThumbnail(
  projectId: string,
  base64: string,
  mimeType: string
): Promise<void> {
  await getDb();
  const project = await requireOwnedProject(projectId);
  const bytes = Buffer.from(base64, "base64");
  const uploaded = await uploadBinaryFile(`${projectId}/thumbnail`, bytes, mimeType);
  project.thumbnailBlobPathname = uploaded.pathname;
  await project.save();
}

export async function softDeleteProject(projectId: string): Promise<void> {
  await getDb();
  const project = await requireOwnedProject(projectId);
  project.trashed = true;
  project.trashedAt = new Date();
  await project.save();
}

export async function restoreProject(projectId: string): Promise<void> {
  await getDb();
  const project = await requireOwnedProject(projectId);
  project.trashed = false;
  project.trashedAt = null;
  await project.save();
}

export async function permanentlyDeleteProject(projectId: string): Promise<void> {
  await getDb();
  const userId = await requireUserId();
  const result = await ProjectModel.deleteOne({ _id: projectId, ownerId: userId });
  if (result.deletedCount === 0) throw new Error(`Project not found: ${projectId}`);
  await CollaboratorModel.deleteMany({ projectId });
}

export async function archiveProject(projectId: string, archived: boolean): Promise<void> {
  await getDb();
  const project = await requireOwnedProject(projectId);
  project.archived = archived;
  await project.save();
}

export async function duplicateProject(projectId: string): Promise<Project> {
  await getDb();
  const userId = await requireUserId();
  const source = await requireOwnedProject(projectId);
  const copy = await ProjectModel.create({
    name: `${source.name} (Copy)`,
    ownerId: userId,
    tags: source.tags,
    settings: source.settings,
    visibility: "private",
  } as never);
  return toProject(copy);
}

// Used by dashboard.ts's "owner" sort label and share/collaborator UI —
// small helper so those modules don't need direct Mongoose access.
export async function getUserNamesByIds(userIds: string[]): Promise<Record<string, string>> {
  await getDb();
  const unique = [...new Set(userIds)];
  const users = await UserModel.find({ _id: { $in: unique } }).select("name");
  const map: Record<string, string> = {};
  for (const u of users) map[String(u._id)] = u.name;
  return map;
}
