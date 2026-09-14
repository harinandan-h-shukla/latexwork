"use server";

import type { Project } from "@/lib/types";
import { getDb } from "@/lib/db/mongoose";
import { ProjectModel } from "@/lib/db/models/project";
import { requireUserId } from "@/lib/db/require-user";

export type CreateProjectMethod = "blank" | "template" | "zip" | "url" | "github";

export interface CreateProjectInput {
  name: string;
  method: CreateProjectMethod;
  templateId?: string;
  sourceUrl?: string;
  githubRepo?: string;
}

function resolveSourceImport(input: CreateProjectInput): Project["sourceImport"] | undefined {
  switch (input.method) {
    case "zip":
      return { kind: "zip", origin: input.name };
    case "url":
      return input.sourceUrl ? { kind: "url", origin: input.sourceUrl } : undefined;
    case "github":
      return input.githubRepo ? { kind: "github", origin: input.githubRepo } : undefined;
    default:
      return undefined;
  }
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  await getDb();
  const userId = await requireUserId();

  const name = input.name.trim() || "Untitled Project";
  const doc = await ProjectModel.create({
    name,
    ownerId: userId,
    sourceTemplateId: input.method === "template" ? input.templateId : undefined,
    sourceImport: resolveSourceImport(input),
  } as never);

  const obj = doc.toObject({ getters: true });
  return {
    id: String(obj._id),
    name: obj.name,
    ownerId: String(obj.ownerId),
    folderId: null,
    tags: [],
    starred: false,
    archived: false,
    trashed: false,
    trashedAt: null,
    createdAt: new Date(obj.createdAt as Date).toISOString(),
    updatedAt: new Date(obj.updatedAt as Date).toISOString(),
    settings: {
      compiler: obj.settings.compiler,
      texLiveVersion: obj.settings.texLiveVersion,
      mainFileId: null,
      spellCheckLanguage: obj.settings.spellCheckLanguage,
      autoCompile: obj.settings.autoCompile,
      compileTimeoutSeconds: obj.settings.compileTimeoutSeconds,
      draftMode: obj.settings.draftMode,
      shellEscape: obj.settings.shellEscape,
    },
    storageUsedBytes: 0,
    visibility: "private",
    publicReadOnlyLink: null,
    sourceTemplateId: obj.sourceTemplateId ? String(obj.sourceTemplateId) : undefined,
    sourceImport: obj.sourceImport
      ? { kind: obj.sourceImport.kind!, origin: obj.sourceImport.origin! }
      : undefined,
  };
}
