import type { BibEntry, BibEntryType, ProjectFile } from "@/lib/types";
import { delay, id, mockDb } from "@/lib/mock-api/db";

function recomputeDuplicateFlags(fileId: string): void {
  const counts = new Map<string, number>();
  for (const e of mockDb.bibEntries) {
    if (e.fileId !== fileId) continue;
    counts.set(e.key, (counts.get(e.key) ?? 0) + 1);
  }
  for (const e of mockDb.bibEntries) {
    if (e.fileId !== fileId) continue;
    e.isDuplicateKey = (counts.get(e.key) ?? 0) > 1;
  }
}

// Used to unconditionally redirect any project with no .bib file yet to the
// demo project — which, since bib entries aren't migrated to MongoDB (real
// project files live there now, never in mockDb.files), meant EVERY real
// project's citation picker/References tab showed the shared demo
// bibliography instead of its own. Every project now keeps its own bib
// file, created fresh and empty on first access (see getReferencesFile)
// rather than borrowed from another project.
function resolveProjectId(projectId: string): string {
  return projectId;
}

export async function getReferencesFile(projectId: string): Promise<ProjectFile> {
  // This is on the dashboard's hot path (called once per project to build
  // the research inbox) - the old 200ms Phase-1 mock-latency delay compounded
  // badly across every project a user owns, so keep it token-small here.
  await delay(20);
  const resolved = resolveProjectId(projectId);
  let file = mockDb.files.find(
    (f) => f.projectId === resolved && f.name.endsWith(".bib")
  );
  if (!file) {
    // First time this project's references have been touched — give it its
    // own empty bib file instead of throwing.
    const now = new Date().toISOString();
    file = {
      id: id("file"),
      projectId: resolved,
      parentId: null,
      type: "file",
      name: "references.bib",
      path: "/references.bib",
      isMain: false,
      isBinary: false,
      sizeBytes: 0,
      createdAt: now,
      updatedAt: now,
      content: "",
    };
    mockDb.files.push(file);
  }
  return file;
}

export async function listBibEntries(fileId: string): Promise<BibEntry[]> {
  await delay();
  return mockDb.bibEntries.filter((e) => e.fileId === fileId);
}

export async function createBibEntry(
  fileId: string,
  entry: Omit<BibEntry, "id" | "fileId" | "isDuplicateKey">
): Promise<BibEntry> {
  await delay(400);
  const newEntry: BibEntry = {
    id: id("bib"),
    fileId,
    key: entry.key,
    type: entry.type,
    fields: entry.fields,
    isDuplicateKey: false,
    doiVerified: Boolean(entry.fields.doi),
    metadataVerified: Boolean(entry.fields.author && entry.fields.title && entry.fields.year),
  };
  mockDb.bibEntries.push(newEntry);
  recomputeDuplicateFlags(fileId);
  return newEntry;
}

export async function updateBibEntry(
  entryId: string,
  patch: Partial<BibEntry>
): Promise<BibEntry> {
  await delay(350);
  const entry = mockDb.bibEntries.find((e) => e.id === entryId);
  if (!entry) throw new Error("Bib entry not found");
  if (patch.key !== undefined) entry.key = patch.key;
  if (patch.type !== undefined) entry.type = patch.type;
  if (patch.fields !== undefined) entry.fields = patch.fields;
  recomputeDuplicateFlags(entry.fileId);
  return entry;
}

export async function deleteBibEntry(entryId: string): Promise<void> {
  await delay(300);
  const idx = mockDb.bibEntries.findIndex((e) => e.id === entryId);
  if (idx === -1) return;
  const { fileId } = mockDb.bibEntries[idx];
  mockDb.bibEntries.splice(idx, 1);
  recomputeDuplicateFlags(fileId);
}

export interface CrossRefResult {
  doi: string;
  title: string;
  authors: string;
  year: string;
}

const CROSSREF_TITLE_TEMPLATES = [
  "A Study of {q}: Methods and Evaluation",
  "Rethinking {q} in Large-Scale Systems",
  "{q}: A Survey",
  "Towards Robust {q} for Real-World Deployments",
  "On the Foundations of {q}",
];

const CROSSREF_AUTHOR_POOL = [
  "Chen, L. and Okafor, N.",
  "Garcia, M. and Patel, R.",
  "Nakamura, Y. and Fischer, K.",
  "Ivanova, S. and Dubois, P.",
  "Kapoor, A. and Rossi, F.",
];

export async function searchCrossRef(query: string): Promise<CrossRefResult[]> {
  await delay(600);
  const q = query.trim() || "Selected Topic";
  const count = 3 + (q.length % 3);
  return Array.from({ length: count }, (_, i) => ({
    doi: `10.1000/${q.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20) || "ref"}-${i + 1}`,
    title: CROSSREF_TITLE_TEMPLATES[i % CROSSREF_TITLE_TEMPLATES.length].replace("{q}", q),
    authors: CROSSREF_AUTHOR_POOL[i % CROSSREF_AUTHOR_POOL.length],
    year: String(2018 + ((i * 2) % 7)),
  }));
}

/**
 * fileId identifies which project's .bib file to import into — previously
 * hardcoded to the shared demo project's file regardless of caller, so
 * every real user's DOI import silently landed in one shared bibliography
 * instead of their own project's.
 */
export async function importFromDoi(doi: string, fileId: string): Promise<BibEntry> {
  await delay(700);
  const file = mockDb.files.find((f) => f.id === fileId);
  if (!file) throw new Error("References file not found");
  const cleanDoi = doi.trim() || "10.1000/unknown";
  const suffix = cleanDoi.split("/").pop() ?? "entry";
  const existingKeys = mockDb.bibEntries.filter((e) => e.fileId === file.id).map((e) => e.key);
  const type: BibEntryType = "article";
  const fields = {
    author: "Ferreira, Ana and Wong, David",
    title: `Findings on ${suffix.replace(/[-_]/g, " ")}`,
    journal: "Journal of Applied Research",
    year: "2023",
    doi: cleanDoi,
  };
  const key = existingKeys.includes(suffix)
    ? `${suffix}-${existingKeys.length + 1}`
    : suffix.replace(/[^a-zA-Z0-9]/g, "") || id("doi");

  return createBibEntry(file.id, { key, type, fields });
}

export interface LibraryItem {
  id: string;
  title: string;
  authors: string;
  year: string;
}

export async function importZoteroLibrary(): Promise<LibraryItem[]> {
  await delay(800);
  return [
    { id: "zot_1", title: "Neural Approaches to Document Retrieval", authors: "Baptiste, C.", year: "2022" },
    { id: "zot_2", title: "Formal Verification of Compiler Optimizations", authors: "Adeyemi, T.", year: "2021" },
    { id: "zot_3", title: "A Taxonomy of Citation Graphs", authors: "Moreau, E. and Lindqvist, A.", year: "2020" },
    { id: "zot_4", title: "Energy-Aware Scheduling for HPC Clusters", authors: "Volkov, D.", year: "2023" },
  ];
}

export async function importMendeleyLibrary(): Promise<LibraryItem[]> {
  await delay(800);
  return [
    { id: "men_1", title: "Interactive Visualization of High-Dimensional Data", authors: "Suzuki, H. and Park, J.", year: "2022" },
    { id: "men_2", title: "Approximation Algorithms for Graph Partitioning", authors: "Novak, P.", year: "2019" },
    { id: "men_3", title: "A Longitudinal Study of Open-Source Contribution Patterns", authors: "Haddad, R.", year: "2021" },
  ];
}

export async function detectDuplicateKeys(fileId: string): Promise<string[]> {
  await delay(20);
  const counts = new Map<string, number>();
  for (const e of mockDb.bibEntries) {
    if (e.fileId !== fileId) continue;
    counts.set(e.key, (counts.get(e.key) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n > 1).map(([key]) => key);
}

export interface CitationUsage {
  count: number;
  sections: string[];
}

const CITE_REGEX = /\\cite[tp]?\*?(?:\[[^\]]*\])?\{([^}]+)\}/g;

/**
 * Scans every seeded .tex file in the project for \cite{...} occurrences and
 * buckets them by key, tagging each occurrence with the nearest preceding
 * \section (or \chapter) heading so the reference detail panel can show
 * "Introduction ×2, Method ×3" the way a real citation-usage index would.
 */
export async function getCitationUsage(projectId: string): Promise<Record<string, CitationUsage>> {
  await delay(150);
  const resolved = resolveProjectId(projectId);

  const usage: Record<string, CitationUsage> = {};
  const sectionRegex = /\\(?:chapter|section)\*?\{([^}]*)\}/g;

  for (const file of mockDb.files) {
    if (file.projectId !== resolved || !file.content) continue;

    const headings: { index: number; title: string }[] = [];
    let sMatch: RegExpExecArray | null;
    sectionRegex.lastIndex = 0;
    while ((sMatch = sectionRegex.exec(file.content)) !== null) {
      headings.push({ index: sMatch.index, title: sMatch[1] });
    }

    CITE_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = CITE_REGEX.exec(file.content)) !== null) {
      const currentSection =
        [...headings].reverse().find((h) => h.index <= match!.index)?.title ?? file.name;
      for (const rawKey of match[1].split(",")) {
        const key = rawKey.trim();
        if (!key) continue;
        const entry = (usage[key] ??= { count: 0, sections: [] });
        entry.count += 1;
        if (!entry.sections.includes(currentSection)) entry.sections.push(currentSection);
      }
    }
  }

  return usage;
}

export interface PaperHealth {
  referenceCount: number;
  citationsResolved: number;
  citationsTotal: number;
  metadataVerifiedCount: number;
  doiVerifiedCount: number;
  unusedReferenceCount: number;
  incompleteMetadataCount: number;
  figuresReferenced: number;
  figuresTotal: number;
  tablesReferenced: number;
  tablesTotal: number;
  /** 0-100, weighted across the checks above. */
  score: number;
}

export async function getPaperHealth(projectId: string): Promise<PaperHealth> {
  await delay(200);
  const resolved = resolveProjectId(projectId);

  const file = mockDb.files.find((f) => f.projectId === resolved && f.name.endsWith(".bib"));
  const entries = file ? mockDb.bibEntries.filter((e) => e.fileId === file.id) : [];
  const broken = await detectBrokenReferences(projectId);

  const citedKeysTotal = new Set([
    ...entries.map((e) => e.key),
    ...broken.undefinedCites,
  ]).size;
  const citationsResolved = citedKeysTotal - broken.undefinedCites.length;

  let figuresTotal = 0;
  let figuresReferenced = 0;
  let tablesTotal = 0;
  let tablesReferenced = 0;
  for (const f of mockDb.files) {
    if (f.projectId !== resolved) continue;
    if (f.isBinary && (f.mimeType?.startsWith("image/") ?? false)) figuresTotal += 1;
    if (!f.content) continue;
    figuresReferenced += (f.content.match(/\\begin\{figure\}/g) ?? []).length;
    tablesTotal += (f.content.match(/\\begin\{table\}/g) ?? []).length;
    tablesReferenced += (f.content.match(/\\begin\{table\}[\s\S]*?\\label\{/g) ?? []).length;
  }
  figuresTotal = Math.max(figuresTotal, figuresReferenced);
  tablesTotal = Math.max(tablesTotal, tablesReferenced);

  const metadataVerifiedCount = entries.filter((e) => e.metadataVerified).length;
  const doiVerifiedCount = entries.filter((e) => e.doiVerified).length;
  const incompleteMetadataCount = entries.length - metadataVerifiedCount;

  const checks = [
    citedKeysTotal > 0 ? citationsResolved / citedKeysTotal : 1,
    entries.length > 0 ? metadataVerifiedCount / entries.length : 1,
    entries.length > 0 ? 1 - broken.unusedEntries.length / entries.length : 1,
    figuresTotal > 0 ? figuresReferenced / figuresTotal : 1,
    tablesTotal > 0 ? tablesReferenced / tablesTotal : 1,
  ];
  const score = Math.round((checks.reduce((a, b) => a + b, 0) / checks.length) * 100);

  return {
    referenceCount: entries.length,
    citationsResolved,
    citationsTotal: citedKeysTotal,
    metadataVerifiedCount,
    doiVerifiedCount,
    unusedReferenceCount: broken.unusedEntries.length,
    incompleteMetadataCount,
    figuresReferenced: Math.min(figuresReferenced, figuresTotal),
    figuresTotal,
    tablesReferenced: Math.min(tablesReferenced, tablesTotal),
    tablesTotal,
    score,
  };
}

export interface BrokenReferences {
  undefinedCites: string[];
  unusedEntries: string[];
}

export async function detectBrokenReferences(projectId: string): Promise<BrokenReferences> {
  await delay(20);
  const resolved = resolveProjectId(projectId);

  const citedKeys = new Set<string>();
  const citeRegex = /\\cite[tp]?\*?(?:\[[^\]]*\])?\{([^}]+)\}/g;
  for (const file of mockDb.files) {
    if (file.projectId !== resolved || !file.content) continue;
    let match: RegExpExecArray | null;
    while ((match = citeRegex.exec(file.content)) !== null) {
      for (const rawKey of match[1].split(",")) {
        const key = rawKey.trim();
        if (key) citedKeys.add(key);
      }
    }
  }

  const entryKeys = new Set(
    mockDb.bibEntries
      .filter((e) => mockDb.files.find((f) => f.id === e.fileId)?.projectId === resolved)
      .map((e) => e.key)
  );

  const undefinedCites = [...citedKeys].filter((k) => !entryKeys.has(k));
  const unusedEntries = [...entryKeys].filter((k) => !citedKeys.has(k));

  return { undefinedCites, unusedEntries };
}
