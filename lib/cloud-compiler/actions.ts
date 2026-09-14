"use server";

// Real cloud compile — replaces the client-side fake in lib/mock-api/compile.ts
// for real (Mongo ObjectId) projects. Split into its own "use server" module
// (rather than added to lib/mock-api/compile.ts directly) because these
// genuinely need the server boundary for a secret the browser must never see
// (CLOUD_COMPILER_SHARED_SECRET) — unlike the rest of lib/mock-api, which is
// "use server" mainly for DB access, not for hiding a credential.

import { getDb } from "@/lib/db/mongoose";
import { ProjectModel, CollaboratorModel } from "@/lib/db/models/project";
import { requireUserId } from "@/lib/db/require-user";
import type {
  CloudBuildStatusResponse,
  CloudCompileRequest,
  CloudSyncTexForward,
  CloudSyncTexInverse,
} from "@/lib/cloud-compiler/types";

const SUPPORTED_ENGINES = new Set(["pdflatex", "xelatex", "lualatex"]);

function cloudCompilerEndpoint(): { url: string; secret: string } {
  const url = process.env.CLOUD_COMPILER_URL;
  const secret = process.env.CLOUD_COMPILER_SHARED_SECRET;
  if (!url || !secret) {
    throw new Error(
      "CLOUD_COMPILER_URL / CLOUD_COMPILER_SHARED_SECRET are not set. Add them to .env.local " +
        "(pointing at a running cloud-compiler/ instance) to use cloud compilation for real projects."
    );
  }
  return { url: url.replace(/\/$/, ""), secret };
}

/** Same owner-or-collaborator check as getProject() in lib/mock-api/projects.ts
 * — reused rather than re-derived, since project access rules live there. */
async function assertProjectAccess(projectId: string, userId: string): Promise<void> {
  await getDb();
  const isCollaborator = await CollaboratorModel.exists({ projectId, userId });
  const project = await ProjectModel.findOne(
    isCollaborator ? { _id: projectId } : { _id: projectId, ownerId: userId }
  ).select("_id");
  if (!project) throw new Error(`Project not found: ${projectId}`);
}

export async function startCloudCompile(request: CloudCompileRequest): Promise<{ buildId: string }> {
  const userId = await requireUserId();
  await assertProjectAccess(request.projectId, userId);

  if (!SUPPORTED_ENGINES.has(request.compiler)) {
    throw new Error(`Cloud compilation doesn't support "${request.compiler}" — use pdflatex, xelatex, or lualatex.`);
  }

  const { url, secret } = cloudCompilerEndpoint();
  const res = await fetch(`${url}/compile`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify({
      projectId: request.projectId,
      callerId: userId,
      mainFile: request.mainFile,
      files: request.files.map((f) => ({ path: f.path, content: f.content })),
      compiler: request.compiler,
      options: { draftMode: request.draftMode, shellEscape: request.shellEscape },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Cloud compile request failed (${res.status}).`);
  return { buildId: body.buildId };
}

export async function getCloudCompileStatus(buildId: string): Promise<CloudBuildStatusResponse> {
  const userId = await requireUserId();
  const { url, secret } = cloudCompilerEndpoint();
  const res = await fetch(`${url}/status/${encodeURIComponent(buildId)}?callerId=${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Cloud status request failed (${res.status}).`);
  return body as CloudBuildStatusResponse;
}

export async function getCloudSyncTexForward(
  buildId: string,
  file: string,
  line: number
): Promise<CloudSyncTexForward | null> {
  const userId = await requireUserId();
  const { url, secret } = cloudCompilerEndpoint();
  const params = new URLSearchParams({ callerId: userId, file, line: String(line) });
  const res = await fetch(`${url}/synctex/forward/${encodeURIComponent(buildId)}?${params}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as CloudSyncTexForward;
}

export async function getCloudSyncTexInverse(
  buildId: string,
  page: number,
  x: number,
  y: number
): Promise<CloudSyncTexInverse | null> {
  const userId = await requireUserId();
  const { url, secret } = cloudCompilerEndpoint();
  const params = new URLSearchParams({ callerId: userId, page: String(page), x: String(x), y: String(y) });
  const res = await fetch(`${url}/synctex/inverse/${encodeURIComponent(buildId)}?${params}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as CloudSyncTexInverse;
}

export async function cancelCloudCompile(buildId: string): Promise<void> {
  const userId = await requireUserId();
  const { url, secret } = cloudCompilerEndpoint();
  await fetch(`${url}/cancel/${encodeURIComponent(buildId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ callerId: userId }),
  }).catch(() => {});
}
