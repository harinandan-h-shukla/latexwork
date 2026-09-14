import type { Project, Template } from "@/lib/types";
import { CURRENT_USER_ID, delay, id, mockDb } from "@/lib/mock-api/db";
import { seedMockDb } from "@/lib/mock-api/seed";
import { createProject } from "@/lib/mock-api/projects-create";
import { importZipTree, type ZipImportEntry } from "@/lib/mock-api/files";

// Real, verified-compilable template source for the templates that have it —
// fetched from /public/templates/<dir>/* (real content, including a real
// IEEEtran.cls fetched from CTAN so the IEEE template compiles without
// depending on what's installed on the compiling machine). Templates not
// listed here still create a project via the generic blank-project
// boilerplate rather than fake/dangling content.
const TEMPLATE_ASSETS: Record<string, { dir: string; files: string[] }> = {
  tpl_ieee_conf: { dir: "ieee-conference", files: ["main.tex", "IEEEtran.cls"] },
  tpl_arxiv_preprint: { dir: "arxiv-preprint", files: ["main.tex", "references.bib"] },
};

async function populateTemplateFiles(projectId: string, templateId: string): Promise<void> {
  const assets = TEMPLATE_ASSETS[templateId];
  if (!assets) return;

  const entries: ZipImportEntry[] = await Promise.all(
    assets.files.map(async (file) => {
      const res = await fetch(`/templates/${assets.dir}/${file}`);
      const content = await res.text();
      return { path: file, content, isBinary: false, sizeBytes: content.length };
    }),
  );
  await importZipTree(projectId, entries);
}

export interface ListTemplatesQuery {
  category?: Template["category"];
  publisher?: string;
  search?: string;
  ownOnly?: boolean;
}

export async function listTemplates(query?: ListTemplatesQuery): Promise<Template[]> {
  seedMockDb();
  await delay(300);

  let results = [...mockDb.templates];

  if (query?.category) {
    results = results.filter((t) => t.category === query.category);
  }
  if (query?.publisher) {
    results = results.filter((t) => t.publisher === query.publisher);
  }
  if (query?.ownOnly) {
    results = results.filter((t) => t.isOwn);
  }
  if (query?.search) {
    const needle = query.search.trim().toLowerCase();
    if (needle) {
      results = results.filter(
        (t) =>
          t.name.toLowerCase().includes(needle) ||
          t.description.toLowerCase().includes(needle) ||
          t.publisher?.toLowerCase().includes(needle),
      );
    }
  }

  return results;
}

export async function getTemplate(templateId: string): Promise<Template> {
  seedMockDb();
  await delay(200);

  const template = mockDb.templates.find((t) => t.id === templateId);
  if (!template) throw new Error(`Template not found: ${templateId}`);
  return template;
}

export async function useTemplate(templateId: string, projectName: string): Promise<Project> {
  seedMockDb();

  const template = mockDb.templates.find((t) => t.id === templateId);
  if (!template) throw new Error(`Template not found: ${templateId}`);

  const project = await createProject({
    name: projectName,
    method: "template",
    templateId: template.id,
  });
  await populateTemplateFiles(project.id, template.id);
  return project;
}

export interface SaveAsTemplateInput {
  sourceProjectName: string;
  name: string;
  category: Template["category"];
  publisher?: string;
  description: string;
}

export async function saveAsTemplate(input: SaveAsTemplateInput): Promise<Template> {
  seedMockDb();
  await delay(600);

  const sourceProject = mockDb.projects.find(
    (p) => p.name === input.sourceProjectName && p.ownerId === CURRENT_USER_ID,
  );

  const template: Template = {
    id: id("tpl"),
    name: input.name.trim() || "Untitled Template",
    category: input.category,
    publisher: input.publisher?.trim() || undefined,
    description: input.description.trim(),
    thumbnailUrl: "/templates/custom-thesis.svg",
    sourceProjectId: sourceProject?.id ?? id("proj"),
    isOwn: true,
    authorId: CURRENT_USER_ID,
  };

  mockDb.templates.push(template);

  return template;
}
