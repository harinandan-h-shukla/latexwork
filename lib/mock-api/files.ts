"use server";

// File CRUD, now real for real projects. Files used to live only in the
// browser's in-memory mockDb, which is why uploaded/typed content vanished
// on every page refresh — there was nothing durable behind it.
//
// The one exception is a legacy (non-Mongo-id) project id: kept on the
// original in-memory path (unchanged) since only REAL projects (real Mongo
// ObjectId ids, which every project created after the Phase 2.2 migration
// has) are stored in MongoDB. The two are told apart by id shape — a mock
// id is never a 24-char hex string, a real Mongo id always is.

import type { ProjectFile } from "@/lib/types";
import { delay, id, mockDb } from "@/lib/mock-api/db";
import { getDb } from "@/lib/db/mongoose";
import { ProjectFileModel, ProjectModel, type ProjectFileDoc } from "@/lib/db/models/project";
import { uploadBinaryFile } from "@/lib/storage/blob-storage";
import type { HydratedDocument } from "mongoose";

const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;
function isRealId(value: string): boolean {
  return OBJECT_ID_RE.test(value);
}

function toProjectFile(doc: HydratedDocument<ProjectFileDoc>): ProjectFile {
  const obj = doc.toObject({ getters: true });
  return {
    id: String(obj._id),
    projectId: String(obj.projectId),
    parentId: obj.parentId ? String(obj.parentId) : null,
    type: obj.type,
    name: obj.name,
    path: obj.path,
    isMain: obj.isMain,
    isBinary: obj.isBinary,
    sizeBytes: obj.sizeBytes,
    mimeType: obj.mimeType ?? undefined,
    thumbnailUrl: obj.thumbnailUrl ?? undefined,
    linkedUrl: obj.linkedUrl ?? undefined,
    blobUrl: obj.blobUrl ?? undefined,
    createdAt: new Date(obj.createdAt as Date).toISOString(),
    updatedAt: new Date(obj.updatedAt as Date).toISOString(),
    content: obj.content ?? undefined,
  };
}

async function realPathFor(parentId: string | null, name: string): Promise<string> {
  if (!parentId) return `/${name}`;
  const parent = await ProjectFileModel.findById(parentId).select("path");
  return parent ? `${parent.path}/${name}` : `/${name}`;
}

async function seedRealProjectDefaults(projectId: string): Promise<void> {
  const existing = await ProjectFileModel.exists({ projectId });
  if (existing) return;
  const content =
    "\\documentclass{article}\n\\usepackage{amsmath}\n\\title{Untitled}\n\\author{}\n\\begin{document}\n\\maketitle\n\n\\section{Introduction}\n\nStart writing here.\n\n\\end{document}\n";
  await ProjectFileModel.create([
    {
      projectId,
      parentId: null,
      type: "file",
      name: "main.tex",
      path: "/main.tex",
      isMain: true,
      isBinary: false,
      sizeBytes: content.length,
      content,
    },
    {
      projectId,
      parentId: null,
      type: "file",
      name: "refs.bib",
      path: "/refs.bib",
      isMain: false,
      isBinary: false,
      sizeBytes: 0,
      content: "",
    },
  ] as never);
}

// ---------------------------------------------------------------------------
// Legacy in-memory path (proj_thesis demo project only) — unchanged from
// before, still relied on by other still-mock modules' demo fallback data.
// ---------------------------------------------------------------------------

const seededProjects = new Set<string>();

function now(): string {
  return new Date().toISOString();
}

function mockPathFor(parentId: string | null, name: string): string {
  if (!parentId) return `/${name}`;
  const parent = mockDb.files.find((f) => f.id === parentId);
  return parent ? `${parent.path}/${name}` : `/${name}`;
}

function pushIfMissing(file: ProjectFile): void {
  if (!mockDb.files.some((f) => f.id === file.id)) {
    mockDb.files.push(file);
  }
}

function seedFilesForProject(projectId: string): void {
  if (seededProjects.has(projectId)) return;
  seededProjects.add(projectId);
  if (mockDb.files.some((f) => f.projectId === projectId)) return;

  // Legacy non-real (in-memory) project id — gets the same minimal blank
  // starting point as a real project.
  const mainId = id("file");
  pushIfMissing({
    id: mainId,
    projectId,
    parentId: null,
    type: "file",
    name: "main.tex",
    path: "/main.tex",
    isMain: true,
    isBinary: false,
    sizeBytes: 340,
    createdAt: now(),
    updatedAt: now(),
    content:
      "\\documentclass{article}\n\\usepackage{amsmath}\n\\title{Untitled}\n\\author{}\n\\begin{document}\n\\maketitle\n\n\\section{Introduction}\n\nStart writing here.\n\n\\end{document}\n",
  });
  const bibId = id("file");
  pushIfMissing({
    id: bibId,
    projectId,
    parentId: null,
    type: "file",
    name: "refs.bib",
    path: "/refs.bib",
    isMain: false,
    isBinary: false,
    sizeBytes: 0,
    createdAt: now(),
    updatedAt: now(),
    content: "",
  });
}

// ---------------------------------------------------------------------------
// Public API — dispatches to Mongo (real projects/files) or the legacy
// in-memory store (proj_thesis) by id shape.
// ---------------------------------------------------------------------------

export interface ZipImportEntry {
  path: string;
  /** Text content when !isBinary. When isBinary, this is instead the
   * entry's raw bytes base64-encoded (uploaded to object storage below,
   * not stored in this field afterward). */
  content: string;
  isBinary: boolean;
  sizeBytes: number;
  mimeType?: string;
}

/** Always real-Mongo — every caller (zip upload, template population) always has a real project id. */
export async function importZipTree(projectId: string, entries: ZipImportEntry[]): Promise<ProjectFile[]> {
  await getDb();
  const created: HydratedDocument<ProjectFileDoc>[] = [];
  const folderIdByPath = new Map<string, string>();

  async function ensureFolder(folderPath: string): Promise<string | null> {
    if (!folderPath) return null;
    const existing = folderIdByPath.get(folderPath);
    if (existing) return existing;
    const lastSlash = folderPath.lastIndexOf("/");
    const parentPath = lastSlash === -1 ? "" : folderPath.slice(0, lastSlash);
    const parentId = await ensureFolder(parentPath);
    const name = lastSlash === -1 ? folderPath : folderPath.slice(lastSlash + 1);
    const folder = await ProjectFileModel.create({
      projectId,
      parentId,
      type: "folder",
      name,
      path: `/${folderPath}`,
      isMain: false,
      isBinary: false,
      sizeBytes: 0,
    } as never);
    created.push(folder);
    folderIdByPath.set(folderPath, String(folder._id));
    return String(folder._id);
  }

  for (const entry of entries) {
    const cleanPath = entry.path.replace(/^\/+/, "");
    const lastSlash = cleanPath.lastIndexOf("/");
    const folderPath = lastSlash === -1 ? "" : cleanPath.slice(0, lastSlash);
    const name = lastSlash === -1 ? cleanPath : cleanPath.slice(lastSlash + 1);
    if (!name) continue;
    const parentId = await ensureFolder(folderPath);
    let blobUrl: string | undefined;
    if (entry.isBinary && entry.content) {
      const bytes = Buffer.from(entry.content, "base64");
      const uploaded = await uploadBinaryFile(`${projectId}/${cleanPath}`, bytes, entry.mimeType);
      blobUrl = uploaded.url;
    }
    const file = await ProjectFileModel.create({
      projectId,
      parentId,
      type: "file",
      name,
      path: `/${cleanPath}`,
      isMain: false,
      isBinary: entry.isBinary,
      sizeBytes: entry.sizeBytes,
      mimeType: entry.mimeType,
      blobUrl,
      content: entry.isBinary ? undefined : entry.content,
    } as never);
    created.push(file);
  }

  const hasExistingMain = await ProjectFileModel.exists({ projectId, isMain: true });
  if (!hasExistingMain) {
    const texFiles = created.filter((f) => f.type === "file" && f.name.toLowerCase().endsWith(".tex"));
    // The only reliable signal for "this is a real compilable root
    // document" (as opposed to a section/header/macro file meant to be
    // \input{}-ed): it actually contains \documentclass. A byte-size
    // heuristic (an earlier attempt at this) still gets it wrong for real
    // kits — e.g. a CVPR/WACV-style kit with a short `_main.tex` entry
    // point and a longer `cvpr_header.tex`/`wacv_header.tex` preamble file
    // it \input{}s: the header is bigger by byte count but has no
    // \documentclass and can't be compiled standalone at all.
    const compilable = texFiles.filter((f) => f.content?.includes("\\documentclass"));
    const candidates = compilable.length > 0 ? compilable : texFiles;
    // A real kit can have more than one compilable root (e.g. a CVPR-style
    // kit's separate main/_rebuttal/_supplementary.tex, all with their own
    // \documentclass) — prefer whichever one's name actually says "main".
    const main =
      candidates.find((f) => f.name.toLowerCase() === "main.tex") ??
      candidates.find((f) => f.name.toLowerCase().includes("main")) ??
      candidates.reduce<HydratedDocument<ProjectFileDoc> | undefined>(
        (largest, f) => ((f.sizeBytes ?? 0) > (largest?.sizeBytes ?? 0) ? f : largest),
        candidates[0]
      );
    if (main) {
      main.isMain = true;
      await main.save();
    }
  }

  return created.map(toProjectFile);
}

export async function ensureProjectFilesSeeded(projectId: string): Promise<void> {
  if (isRealId(projectId)) return; // seeded lazily in listFiles for real projects
  seedFilesForProject(projectId);
}

export async function listFiles(projectId: string): Promise<ProjectFile[]> {
  if (isRealId(projectId)) {
    await getDb();
    await seedRealProjectDefaults(projectId);
    const docs = await ProjectFileModel.find({ projectId });
    return docs
      .map(toProjectFile)
      .sort((a, b) => (a.type !== b.type ? (a.type === "folder" ? -1 : 1) : a.name.localeCompare(b.name)));
  }
  seedFilesForProject(projectId);
  await delay(250);
  return mockDb.files
    .filter((f) => f.projectId === projectId)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export async function getFile(fileId: string): Promise<ProjectFile> {
  if (isRealId(fileId)) {
    await getDb();
    const doc = await ProjectFileModel.findById(fileId);
    if (!doc) throw new Error("File not found");
    return toProjectFile(doc);
  }
  await delay(150);
  const file = mockDb.files.find((f) => f.id === fileId);
  if (!file) throw new Error("File not found");
  return file;
}

export async function getFileContent(fileId: string): Promise<string> {
  if (isRealId(fileId)) {
    await getDb();
    const doc = await ProjectFileModel.findById(fileId).select("content");
    return doc?.content ?? "";
  }
  await delay(150);
  const file = mockDb.files.find((f) => f.id === fileId);
  return file?.content ?? "";
}

export interface CreateFileInput {
  parentId: string | null;
  type: "file" | "folder";
  name: string;
}

export async function createFile(projectId: string, input: CreateFileInput): Promise<ProjectFile> {
  if (isRealId(projectId)) {
    await getDb();
    const path = await realPathFor(input.parentId, input.name);
    const doc = await ProjectFileModel.create({
      projectId,
      parentId: input.parentId,
      type: input.type,
      name: input.name,
      path,
      isMain: false,
      isBinary: false,
      sizeBytes: 0,
      content: input.type === "file" ? "" : undefined,
    } as never);
    return toProjectFile(doc);
  }

  await delay(300);
  const file: ProjectFile = {
    id: id("file"),
    projectId,
    parentId: input.parentId,
    type: input.type,
    name: input.name,
    path: mockPathFor(input.parentId, input.name),
    isMain: false,
    isBinary: false,
    sizeBytes: 0,
    createdAt: now(),
    updatedAt: now(),
    content: input.type === "file" ? "" : undefined,
  };
  mockDb.files.push(file);
  return file;
}

export async function renameFile(fileId: string, name: string): Promise<ProjectFile> {
  if (isRealId(fileId)) {
    await getDb();
    const doc = await ProjectFileModel.findById(fileId);
    if (!doc) throw new Error("File not found");
    doc.name = name;
    doc.path = await realPathFor(doc.parentId ? String(doc.parentId) : null, name);
    await doc.save();
    return toProjectFile(doc);
  }

  await delay(250);
  const file = mockDb.files.find((f) => f.id === fileId);
  if (!file) throw new Error("File not found");
  file.name = name;
  file.path = mockPathFor(file.parentId, name);
  file.updatedAt = now();
  return file;
}

function collectWithDescendantsMock(fileIds: string[]): Set<string> {
  const toDelete = new Set(fileIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of mockDb.files) {
      if (f.parentId && toDelete.has(f.parentId) && !toDelete.has(f.id)) {
        toDelete.add(f.id);
        changed = true;
      }
    }
  }
  return toDelete;
}

async function collectWithDescendantsReal(projectId: string, fileIds: string[]): Promise<Set<string>> {
  const all = await ProjectFileModel.find({ projectId }).select("parentId");
  const byId = all.map((f) => ({ id: String(f._id), parentId: f.parentId ? String(f.parentId) : null }));
  const toDelete = new Set(fileIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of byId) {
      if (f.parentId && toDelete.has(f.parentId) && !toDelete.has(f.id)) {
        toDelete.add(f.id);
        changed = true;
      }
    }
  }
  return toDelete;
}

export async function deleteFile(fileId: string): Promise<void> {
  if (isRealId(fileId)) {
    await getDb();
    const doc = await ProjectFileModel.findById(fileId).select("projectId");
    if (!doc) return;
    const toDelete = await collectWithDescendantsReal(String(doc.projectId), [fileId]);
    await ProjectFileModel.deleteMany({ _id: { $in: Array.from(toDelete) } });
    return;
  }
  await delay(300);
  const toDelete = collectWithDescendantsMock([fileId]);
  mockDb.files = mockDb.files.filter((f) => !toDelete.has(f.id));
}

export async function bulkDeleteFiles(fileIds: string[]): Promise<string[]> {
  if (fileIds.length > 0 && isRealId(fileIds[0])) {
    await getDb();
    const first = await ProjectFileModel.findById(fileIds[0]).select("projectId");
    if (!first) return [];
    const toDelete = await collectWithDescendantsReal(String(first.projectId), fileIds);
    await ProjectFileModel.deleteMany({ _id: { $in: Array.from(toDelete) } });
    return Array.from(toDelete);
  }
  await delay(400);
  const toDelete = collectWithDescendantsMock(fileIds);
  mockDb.files = mockDb.files.filter((f) => !toDelete.has(f.id));
  return Array.from(toDelete);
}

export async function moveFile(fileId: string, newParentId: string | null): Promise<ProjectFile> {
  if (isRealId(fileId)) {
    await getDb();
    const doc = await ProjectFileModel.findById(fileId);
    if (!doc) throw new Error("File not found");
    doc.parentId = newParentId as never;
    doc.path = await realPathFor(newParentId, doc.name);
    await doc.save();
    return toProjectFile(doc);
  }

  await delay(300);
  const file = mockDb.files.find((f) => f.id === fileId);
  if (!file) throw new Error("File not found");
  file.parentId = newParentId;
  file.path = mockPathFor(newParentId, file.name);
  file.updatedAt = now();
  return file;
}

export async function bulkMoveFiles(fileIds: string[], newParentId: string | null): Promise<ProjectFile[]> {
  if (fileIds.length > 0 && isRealId(fileIds[0])) {
    await getDb();
    const moved: ProjectFile[] = [];
    for (const fileId of fileIds) {
      const doc = await ProjectFileModel.findById(fileId);
      if (!doc) continue;
      doc.parentId = newParentId as never;
      doc.path = await realPathFor(newParentId, doc.name);
      await doc.save();
      moved.push(toProjectFile(doc));
    }
    return moved;
  }

  await delay(350);
  const moved: ProjectFile[] = [];
  for (const fileId of fileIds) {
    const file = mockDb.files.find((f) => f.id === fileId);
    if (!file) continue;
    file.parentId = newParentId;
    file.path = mockPathFor(newParentId, file.name);
    file.updatedAt = now();
    moved.push(file);
  }
  return moved;
}

export async function duplicateFile(fileId: string): Promise<ProjectFile> {
  if (isRealId(fileId)) {
    await getDb();
    const file = await ProjectFileModel.findById(fileId);
    if (!file) throw new Error("File not found");
    const copyName = file.name.includes(".")
      ? file.name.replace(/(\.[^.]+)$/, " copy$1")
      : `${file.name} copy`;
    const copy = await ProjectFileModel.create({
      projectId: file.projectId,
      parentId: file.parentId,
      type: file.type,
      name: copyName,
      path: await realPathFor(file.parentId ? String(file.parentId) : null, copyName),
      isMain: false,
      isBinary: file.isBinary,
      sizeBytes: file.sizeBytes,
      mimeType: file.mimeType,
      content: file.content,
    } as never);
    return toProjectFile(copy);
  }

  await delay(350);
  const file = mockDb.files.find((f) => f.id === fileId);
  if (!file) throw new Error("File not found");
  const copyName = file.name.includes(".")
    ? file.name.replace(/(\.[^.]+)$/, " copy$1")
    : `${file.name} copy`;
  const copy: ProjectFile = {
    ...file,
    id: id("file"),
    name: copyName,
    path: mockPathFor(file.parentId, copyName),
    isMain: false,
    createdAt: now(),
    updatedAt: now(),
  };
  mockDb.files.push(copy);
  return copy;
}

export async function updateFileContent(fileId: string, content: string): Promise<void> {
  if (isRealId(fileId)) {
    await getDb();
    await ProjectFileModel.updateOne({ _id: fileId }, { content, sizeBytes: content.length });
    return;
  }
  await delay(200);
  const file = mockDb.files.find((f) => f.id === fileId);
  if (!file) return;
  file.content = content;
  file.sizeBytes = content.length;
  file.updatedAt = now();
}

export async function setMainFile(projectId: string, fileId: string): Promise<void> {
  if (isRealId(projectId)) {
    await getDb();
    await ProjectFileModel.updateMany({ projectId }, { isMain: false });
    await ProjectFileModel.updateOne({ _id: fileId }, { isMain: true });
    await ProjectModel.updateOne({ _id: projectId }, { "settings.mainFileId": fileId });
    return;
  }
  await delay(250);
  for (const f of mockDb.files) {
    if (f.projectId === projectId) f.isMain = f.id === fileId;
  }
  const project = mockDb.projects.find((p) => p.id === projectId);
  if (project) project.settings.mainFileId = fileId;
}

export interface UploadFileInput {
  parentId: string | null;
  name: string;
  sizeBytes: number;
  mimeType?: string;
  isBinary: boolean;
  /** Text content when !isBinary. When isBinary, this is instead the
   * file's raw bytes base64-encoded — the actual upload path for real
   * projects (see uploadBinaryFile), not stored in this field afterward. */
  content?: string;
}

export async function uploadFiles(projectId: string, files: UploadFileInput[]): Promise<ProjectFile[]> {
  if (isRealId(projectId)) {
    await getDb();
    const created: ProjectFile[] = [];
    for (const f of files) {
      const path = await realPathFor(f.parentId, f.name);
      let blobUrl: string | undefined;
      if (f.isBinary && f.content) {
        const bytes = Buffer.from(f.content, "base64");
        const uploaded = await uploadBinaryFile(`${projectId}${path}`, bytes, f.mimeType);
        blobUrl = uploaded.url;
      }
      const doc = await ProjectFileModel.create({
        projectId,
        parentId: f.parentId,
        type: "file",
        name: f.name,
        path,
        isMain: false,
        isBinary: f.isBinary,
        sizeBytes: f.sizeBytes,
        mimeType: f.mimeType,
        blobUrl,
        content: f.isBinary ? undefined : (f.content ?? ""),
      } as never);
      created.push(toProjectFile(doc));
    }
    return created;
  }

  await delay(600);
  const created = files.map((f) => {
    const file: ProjectFile = {
      id: id("file"),
      projectId,
      parentId: f.parentId,
      type: "file",
      name: f.name,
      path: mockPathFor(f.parentId, f.name),
      isMain: false,
      isBinary: f.isBinary,
      sizeBytes: f.sizeBytes,
      mimeType: f.mimeType,
      createdAt: now(),
      updatedAt: now(),
      content: f.isBinary ? undefined : (f.content ?? ""),
    };
    mockDb.files.push(file);
    return file;
  });
  return created;
}

export async function downloadFile(fileId: string): Promise<{ filename: string; content: string }> {
  if (isRealId(fileId)) {
    await getDb();
    const doc = await ProjectFileModel.findById(fileId);
    if (!doc) throw new Error("File not found");
    return { filename: doc.name, content: doc.content ?? "" };
  }
  await delay(200);
  const file = mockDb.files.find((f) => f.id === fileId);
  if (!file) throw new Error("File not found");
  return { filename: file.name, content: file.content ?? "" };
}

export async function downloadFiles(fileIds: string[]): Promise<{ filename: string; content: string }> {
  if (fileIds.length > 0 && isRealId(fileIds[0])) {
    await getDb();
    const docs = await ProjectFileModel.find({ _id: { $in: fileIds }, type: "file" });
    const content = docs.map((f) => `${f.path}\n${f.content ?? "[binary]"}\n`).join("\n---\n");
    return { filename: "selected-files.txt", content };
  }
  await delay(300);
  const files = mockDb.files.filter((f) => fileIds.includes(f.id) && f.type === "file");
  const content = files
    .map((f) => `${f.path}\n${f.content ?? "[binary]"}\n`)
    .join("\n---\n");
  return { filename: "selected-files.txt", content };
}

export async function downloadProjectManifest(projectId: string): Promise<{ filename: string; content: string }> {
  if (isRealId(projectId)) {
    await getDb();
    const [docs, project] = await Promise.all([
      ProjectFileModel.find({ projectId, type: "file" }),
      ProjectModel.findById(projectId).select("name"),
    ]);
    const manifest = docs.map((f) => `${f.path}\n${f.content ?? "[binary]"}\n`).join("\n---\n");
    return { filename: `${project?.name ?? "project"}.txt`, content: manifest };
  }
  seedFilesForProject(projectId);
  await delay(400);
  const files = mockDb.files.filter((f) => f.projectId === projectId && f.type === "file");
  const project = mockDb.projects.find((p) => p.id === projectId);
  const manifest = files.map((f) => `${f.path}\n${f.content ?? "[binary]"}\n`).join("\n---\n");
  return { filename: `${project?.name ?? "project"}.txt`, content: manifest };
}
