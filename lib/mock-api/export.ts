"use server";

// Was missing "use server" despite doing real work (listFiles/getProject
// hit MongoDB) — every exported function here happened to still work when
// called from a client component only because listFiles/getProject are
// themselves server actions (imported RPC stubs, not inlined code), so the
// missing directive never surfaced as a build break the way the same gap
// did in collaboration.ts. It still meant everything else in this file
// (JSZip, the mock PDF renderer) ran in the browser instead of the server.
// Fixing it now is also what makes it safe to import blob-storage.ts
// (server-only) below for the zip export's binary files.

import JSZip from "jszip";
import type { ApiKey, Webhook } from "@/lib/types";
import { CURRENT_USER_ID, delay, id, mockDb } from "@/lib/mock-api/db";
import { seedMockDb } from "@/lib/mock-api/seed";
import { renderMockPdfBytes, type RenderableFile } from "@/lib/mock-api/mock-pdf-renderer";
import { listFiles } from "@/lib/mock-api/files";
import { getProject } from "@/lib/mock-api/projects";
import { getBinaryFileStream } from "@/lib/storage/blob-storage";

function now(): string {
  return new Date().toISOString();
}

interface ExportableFile {
  path: string;
  content: string;
  isMain: boolean;
}

const FALLBACK_MAIN_FILE: ExportableFile = {
  path: "/main.tex",
  content: "\\documentclass{article}\n\\begin{document}\nStart writing here.\n\\end{document}\n",
  isMain: true,
};

/**
 * Reads real project files (MongoDB for real projects, the legacy in-memory
 * store for the proj_thesis demo — listFiles() already dispatches on id
 * shape). This used to read mockDb.files directly, which broke for every
 * real project once file content moved to MongoDB (Phase 2.2 continued) —
 * that array is never populated for real projects.
 */
async function projectTexFiles(projectId: string): Promise<ExportableFile[]> {
  const files = await listFiles(projectId);
  return files
    .filter((f) => f.type === "file" && !f.isBinary && f.name.endsWith(".tex"))
    .map((f) => ({ path: f.path, content: f.content ?? "", isMain: f.isMain }));
}

async function readStreamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

interface ExportableZipFile {
  path: string;
  isMain: boolean;
  text?: string;
  bytes?: Uint8Array;
}

/** Unlike projectTexFiles/projectAllTextFiles, this actually fetches binary
 * files' real bytes from blob storage instead of writing them as empty —
 * the zip download is meant to be a faithful local copy of the project
 * (see the "local save for privacy" feature), and a project with figures
 * silently lost every one of them on every download until this existed. */
async function projectAllFilesForZip(projectId: string): Promise<ExportableZipFile[]> {
  const files = await listFiles(projectId);
  const results: ExportableZipFile[] = [];
  for (const f of files) {
    if (f.type !== "file") continue;
    if (f.isBinary) {
      if (f.blobPathname) {
        const blob = await getBinaryFileStream(f.blobPathname);
        if (blob) {
          results.push({ path: f.path, isMain: f.isMain, bytes: await readStreamToBytes(blob.stream) });
          continue;
        }
      }
      // No bytes in storage for this entry (e.g. a binary row from before
      // blob storage existed) — omit it rather than writing a 0-byte file
      // that looks like real (but empty) content.
      continue;
    }
    results.push({ path: f.path, isMain: f.isMain, text: f.content ?? "" });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export interface ExportResult {
  filename: string;
  content: string;
  /** "base64" for binary formats (pdf/zip); plain utf8 text otherwise. */
  encoding: "utf8" | "base64";
}

export async function exportProject(
  projectId: string,
  format: "pdf" | "zip" | "inlined-tex"
): Promise<ExportResult> {
  seedMockDb();
  await delay(500);
  const project = await getProject(projectId).catch(() => null);
  const slug = (project?.name ?? "project").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();

  if (format === "pdf") {
    // A real, valid PDF (via pdf-lib) — the same renderer the compile preview
    // uses — not a truncated fake header string a viewer would reject.
    const files = await listFiles(projectId);
    const renderable: RenderableFile[] = files
      .filter((f) => f.type === "file" && !f.isBinary)
      .map((f) => ({ id: f.id, path: f.path, name: f.name, content: f.content ?? "", isMain: f.isMain }));
    const { bytes } = await renderMockPdfBytes(renderable, project?.name ?? "Untitled document");
    return { filename: `${slug}.pdf`, content: Buffer.from(bytes).toString("base64"), encoding: "base64" };
  }

  if (format === "inlined-tex") {
    const texFiles = await projectTexFiles(projectId);
    const files = texFiles.length > 0 ? texFiles : [FALLBACK_MAIN_FILE];
    const main = files.find((f) => f.isMain) ?? files[0];
    const others = files.filter((f) => f !== main);
    const inlined = [
      `% Inlined single-file export of "${project?.name ?? projectId}"`,
      `% Generated ${now()}`,
      "",
      main.content,
      ...others.map((f) => `\n% --- inlined from ${f.path} ---\n${f.content}`),
    ].join("\n");
    return { filename: `${slug}.tex`, content: inlined, encoding: "utf8" };
  }

  // A real zip archive (via JSZip) — the source was previously a plain-text
  // manifest wearing a ".zip" extension, which no zip client could open.
  const allFiles = await projectAllFilesForZip(projectId);
  const files: ExportableZipFile[] =
    allFiles.length > 0 ? allFiles : [{ path: FALLBACK_MAIN_FILE.path, isMain: true, text: FALLBACK_MAIN_FILE.content }];
  const zip = new JSZip();
  for (const f of files) {
    const cleanPath = f.path.replace(/^\//, "");
    zip.file(cleanPath, f.bytes ?? f.text ?? "");
  }
  const zipBytes = await zip.generateAsync({ type: "uint8array" });
  return { filename: `${slug}.zip`, content: Buffer.from(zipBytes).toString("base64"), encoding: "base64" };
}

// ---------------------------------------------------------------------------
// Import (zip / GitHub / URL / Overleaf migration) — mock flow only
// ---------------------------------------------------------------------------

export type ImportSource = "zip" | "github" | "url" | "overleaf";

export async function importProject(
  projectId: string,
  source: ImportSource,
  origin: string
): Promise<{ importedFileCount: number }> {
  seedMockDb();
  await delay(900);
  const project = mockDb.projects.find((p) => p.id === projectId);
  if (project) {
    project.sourceImport = { kind: source, origin };
    project.updatedAt = now();
  }
  // Mock only: a real implementation would extract/clone files into mockDb.files.
  return { importedFileCount: source === "zip" ? 6 : source === "github" ? 11 : 3 };
}

// ---------------------------------------------------------------------------
// Git sync
// ---------------------------------------------------------------------------

interface GitConnection {
  repoUrl: string;
  lastSyncedAt: string | null;
}

const gitConnections = new Map<string, GitConnection>();

export async function connectGitRepo(projectId: string, repoUrl: string): Promise<void> {
  await delay(500);
  gitConnections.set(projectId, { repoUrl, lastSyncedAt: null });
}

export async function disconnectGitRepo(projectId: string): Promise<void> {
  await delay(250);
  gitConnections.delete(projectId);
}

export async function getGitConnection(projectId: string): Promise<GitConnection | null> {
  await delay(150);
  return gitConnections.get(projectId) ?? null;
}

export async function syncGit(
  projectId: string,
  direction: "push" | "pull"
): Promise<{ syncedAt: string }> {
  await delay(700);
  const syncedAt = now();
  const existing = gitConnections.get(projectId);
  if (existing) existing.lastSyncedAt = syncedAt;
  void direction;
  return { syncedAt };
}

// ---------------------------------------------------------------------------
// Dropbox / Google Drive connect
// ---------------------------------------------------------------------------

export type CloudProvider = "dropbox" | "google-drive";

const cloudConnections = new Map<string, Set<CloudProvider>>();

export async function listCloudConnections(projectId: string): Promise<CloudProvider[]> {
  await delay(150);
  return Array.from(cloudConnections.get(projectId) ?? []);
}

export async function connectCloudProvider(projectId: string, provider: CloudProvider): Promise<void> {
  await delay(500);
  const set = cloudConnections.get(projectId) ?? new Set<CloudProvider>();
  set.add(provider);
  cloudConnections.set(projectId, set);
}

export async function disconnectCloudProvider(projectId: string, provider: CloudProvider): Promise<void> {
  await delay(300);
  cloudConnections.get(projectId)?.delete(provider);
}

// ---------------------------------------------------------------------------
// API keys (account-scoped)
// ---------------------------------------------------------------------------

export async function listApiKeys(projectId: string): Promise<ApiKey[]> {
  seedMockDb();
  await delay(250);
  void projectId; // API keys are account-scoped in this mock; shown the same on every project.
  return mockDb.apiKeys.filter((k) => k.userId === CURRENT_USER_ID);
}

export async function generateApiKey(label: string): Promise<ApiKey & { fullKey: string }> {
  await delay(500);
  const secret = Array.from({ length: 32 }, () => Math.random().toString(36)[2] ?? "0").join("");
  const fullKey = `inkw_${secret}`;
  const key: ApiKey = {
    id: id("key"),
    userId: CURRENT_USER_ID,
    label,
    keyPrefix: fullKey.slice(0, 12),
    createdAt: now(),
    lastUsedAt: null,
    revoked: false,
  };
  mockDb.apiKeys.push(key);
  return { ...key, fullKey };
}

export async function revokeApiKey(keyId: string): Promise<void> {
  await delay(250);
  const key = mockDb.apiKeys.find((k) => k.id === keyId);
  if (key) key.revoked = true;
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

export async function listWebhooks(projectId: string): Promise<Webhook[]> {
  seedMockDb();
  await delay(250);
  return mockDb.webhooks.filter((w) => w.projectId === projectId);
}

export async function createWebhook(
  projectId: string,
  url: string,
  events: Webhook["events"]
): Promise<Webhook> {
  await delay(400);
  const webhook: Webhook = {
    id: id("webhook"),
    projectId,
    url,
    events,
    active: true,
    createdAt: now(),
  };
  mockDb.webhooks.push(webhook);
  return webhook;
}

export async function deleteWebhook(webhookId: string): Promise<void> {
  await delay(250);
  mockDb.webhooks = mockDb.webhooks.filter((w) => w.id !== webhookId);
}
