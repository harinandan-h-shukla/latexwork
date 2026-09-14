import JSZip from "jszip";
import type { ApiKey, Webhook } from "@/lib/types";
import { CURRENT_USER_ID, delay, id, mockDb } from "@/lib/mock-api/db";
import { seedMockDb } from "@/lib/mock-api/seed";
import { renderMockPdfBytes, type RenderableFile } from "@/lib/mock-api/mock-pdf-renderer";
import { listFiles } from "@/lib/mock-api/files";
import { getProject } from "@/lib/mock-api/projects";

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

async function projectAllTextFiles(projectId: string): Promise<ExportableFile[]> {
  const files = await listFiles(projectId);
  return files
    .filter((f) => f.type === "file")
    .map((f) => ({ path: f.path, content: f.isBinary ? "" : (f.content ?? ""), isMain: f.isMain }));
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
  const allFiles = await projectAllTextFiles(projectId);
  const files = allFiles.length > 0 ? allFiles : [FALLBACK_MAIN_FILE];
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.path.replace(/^\//, ""), f.content);
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
