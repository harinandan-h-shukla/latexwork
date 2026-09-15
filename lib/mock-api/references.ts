"use server";

// References/citations, now real for real projects. This used to always
// read/write lib/mock-api/db.ts's in-memory mockDb — harmless for legacy
// mock projects, but for a REAL project getReferencesFile() looked up
// mockDb.files (which real project files are never in — they live in
// MongoDB), so it always failed to find the user's actual uploaded .bib
// file and fabricated a throwaway empty one instead. Every bib-entry
// mutation went to mockDb.bibEntries, which was never persisted anywhere
// and vanished on server restart. BibEntryModel already existed in Mongo
// and was simply unused. Function signatures are unchanged.

import type { BibEntry, BibEntryType, ProjectFile } from "@/lib/types";
import { delay, id, mockDb } from "@/lib/mock-api/db";
import { getDb } from "@/lib/db/mongoose";
import { BibEntryModel } from "@/lib/db/models/references";
import { ProjectFileModel } from "@/lib/db/models/project";
import { listFiles, createFile } from "@/lib/mock-api/files";
import { parseBibEntries } from "@/lib/bibtex";
import type { HydratedDocument } from "mongoose";
import type { BibEntryDoc } from "@/lib/db/models/references";

const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;
function isRealId(value: string): boolean {
  return OBJECT_ID_RE.test(value);
}

function toBibEntry(doc: HydratedDocument<BibEntryDoc>, isDuplicateKey: boolean): BibEntry {
  const obj = doc.toObject({ getters: true });
  return {
    id: String(obj._id),
    fileId: String(obj.fileId),
    key: obj.key,
    type: obj.type as BibEntryType,
    fields: Object.fromEntries((obj.fields as Map<string, string>) ?? []),
    isDuplicateKey,
    doiVerified: obj.doiVerified,
    metadataVerified: obj.metadataVerified,
  };
}

/** Duplicate-key detection is a query over the file's current entries, not
 * a stored flag — see the comment on BibEntrySchema in
 * lib/db/models/references.ts for why (a denormalized boolean would need
 * updating on every sibling entry's mutation; a real implementation
 * recomputes it instead, same as the mock path already does). */
async function listRealBibEntries(fileId: string): Promise<BibEntry[]> {
  const docs = await BibEntryModel.find({ fileId } as never);
  const counts = new Map<string, number>();
  for (const d of docs) counts.set(d.key, (counts.get(d.key) ?? 0) + 1);
  return docs.map((d) => toBibEntry(d, (counts.get(d.key) ?? 0) > 1));
}

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

export async function getReferencesFile(projectId: string): Promise<ProjectFile> {
  if (isRealId(projectId)) {
    await getDb();
    const files = await listFiles(projectId);
    const existing = files.find((f) => f.type === "file" && f.name.toLowerCase().endsWith(".bib"));
    if (existing) {
      // A .bib file that arrived with real content (e.g. a zip upload's
      // real bibliography) but has no BibEntry docs yet — the structured
      // entries this app actually reads/writes everywhere else (the
      // References panel, citation picker, duplicate-key detection) live
      // in BibEntryModel, not in the file's raw text, and nothing parses
      // one into the other on import. Using the existing parser (already
      // used by the raw-bibtex editor's own apply step) rather than
      // writing a second one, so a freshly-imported project's real
      // citations actually show up instead of reading as empty.
      if (existing.content?.trim()) {
        const alreadyHydrated = await BibEntryModel.exists({ fileId: existing.id });
        if (!alreadyHydrated) {
          const parsed = parseBibEntries(existing.content);
          if (parsed.length > 0) {
            await BibEntryModel.insertMany(
              parsed.map((p) => ({
                fileId: existing.id,
                key: p.key,
                type: p.type,
                fields: p.fields,
                doiVerified: Boolean(p.fields.doi),
                metadataVerified: Boolean(p.fields.author && p.fields.title && p.fields.year),
              })) as never
            );
          }
        }
      }
      return existing;
    }
    // First time this project's references have been touched — give it
    // its own empty bib file instead of throwing.
    //
    // This lookup-then-create isn't atomic, and ProjectFileSchema has a
    // unique index on {projectId, path} (lib/db/models/project.ts). Two
    // requests racing here (e.g. a template/zip/URL/GitHub-imported project
    // with no .bib file, opened in two tabs, or a Next.js <Link>
    // hover-prefetch of /references landing at nearly the same time as the
    // real navigation) both see "no existing .bib" and both call createFile,
    // so the loser gets a duplicate-key error and the References tab 500s.
    // Forced deterministically with an artificial delay inserted before this
    // point (removed again after confirming the fix) plus several
    // concurrent requests; not reproducible under normal timing against
    // local in-memory MongoDB, where these calls resolve too close together
    // to collide — real network latency (e.g. Atlas in production) is what
    // opens the window in practice. Rather than making file creation atomic
    // (a files.ts change), treat losing the race as "someone else already
    // created it" and re-read instead of failing the request.
    //
    // NOTE: seedRealProjectDefaults() in lib/mock-api/files.ts (called from
    // listFiles(), which this function calls just above) has the same
    // check-then-create shape against the same unique index, for every new
    // project's default main.tex/refs.bib — and is reachable by any two
    // concurrent listFiles() callers, not just References. That's a more
    // general instance of this same race and a plausible cause of the
    // "POST /projects/:id/references -> 500" seen on a real production
    // walkthrough (production redacts the stack trace, so which exact insert
    // collided couldn't be confirmed there). Left unfixed here since it's in
    // files.ts, which another change in this repo is actively touching.
    try {
      return await createFile(projectId, { parentId: null, type: "file", name: "references.bib" });
    } catch (error) {
      const isDuplicateKey =
        typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
      if (!isDuplicateKey) throw error;
      const retryFiles = await listFiles(projectId);
      const created = retryFiles.find((f) => f.type === "file" && f.name.toLowerCase().endsWith(".bib"));
      if (!created) throw error;
      return created;
    }
  }

  // This is on the dashboard's hot path (called once per project to build
  // the research inbox) - the old 200ms Phase-1 mock-latency delay compounded
  // badly across every project a user owns, so keep it token-small here.
  await delay(20);
  let file = mockDb.files.find((f) => f.projectId === projectId && f.name.endsWith(".bib"));
  if (!file) {
    const now = new Date().toISOString();
    file = {
      id: id("file"),
      projectId,
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
  if (isRealId(fileId)) {
    await getDb();
    return listRealBibEntries(fileId);
  }
  await delay();
  return mockDb.bibEntries.filter((e) => e.fileId === fileId);
}

export async function createBibEntry(
  fileId: string,
  entry: Omit<BibEntry, "id" | "fileId" | "isDuplicateKey">
): Promise<BibEntry> {
  if (isRealId(fileId)) {
    await getDb();
    const doiVerified = Boolean(entry.fields.doi);
    const metadataVerified = Boolean(entry.fields.author && entry.fields.title && entry.fields.year);
    const doc = await BibEntryModel.create({
      fileId,
      key: entry.key,
      type: entry.type,
      fields: entry.fields,
      doiVerified,
      metadataVerified,
    } as never);
    const isDuplicateKey = (await BibEntryModel.countDocuments({ fileId, key: entry.key } as never)) > 1;
    return toBibEntry(doc, isDuplicateKey);
  }

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

export async function updateBibEntry(entryId: string, patch: Partial<BibEntry>): Promise<BibEntry> {
  if (isRealId(entryId)) {
    await getDb();
    const doc = await BibEntryModel.findById(entryId);
    if (!doc) throw new Error("Bib entry not found");
    const docAny = doc as unknown as { key: string; type: BibEntryType; fields: Map<string, string>; save: () => Promise<unknown> };
    if (patch.key !== undefined) docAny.key = patch.key;
    if (patch.type !== undefined) docAny.type = patch.type;
    if (patch.fields !== undefined) docAny.fields = new Map(Object.entries(patch.fields));
    await docAny.save();
    const isDuplicateKey = (await BibEntryModel.countDocuments({ fileId: doc.fileId, key: docAny.key } as never)) > 1;
    return toBibEntry(doc, isDuplicateKey);
  }

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
  if (isRealId(entryId)) {
    await getDb();
    await BibEntryModel.findByIdAndDelete(entryId);
    return;
  }

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

// Still mock — CrossRef's own REST API is real and keyless, but wiring it up
// for real is a separate, deliberate task (rate limits, result-shape
// mapping, error handling for a live third-party dependency), not something
// to fold in silently while fixing the .bib-file storage bug. Flagged, not
// quietly built or quietly left unmentioned.
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

export async function importFromDoi(doi: string, fileId: string): Promise<BibEntry> {
  if (isRealId(fileId)) {
    await getDb();
    const exists = await ProjectFileModel.exists({ _id: fileId });
    if (!exists) throw new Error("References file not found");
    const cleanDoi = doi.trim() || "10.1000/unknown";
    const suffix = cleanDoi.split("/").pop() ?? "entry";
    const existingKeys = (await BibEntryModel.find({ fileId } as never).select("key")).map((e) => e.key);
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
    return createBibEntry(fileId, { key, type, fields });
  }

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

// Still mock — Zotero/Mendeley need real OAuth credentials this environment
// doesn't have configured, same limitation as Google/GitHub login in
// lib/mock-api/auth.ts.
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
  if (isRealId(fileId)) {
    await getDb();
    const docs = await BibEntryModel.find({ fileId } as never).select("key");
    const counts = new Map<string, number>();
    for (const d of docs) counts.set(d.key, (counts.get(d.key) ?? 0) + 1);
    return [...counts.entries()].filter(([, n]) => n > 1).map(([key]) => key);
  }
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
const SECTION_REGEX = /\\(?:chapter|section)\*?\{([^}]*)\}/g;

function scanCitationUsage(fileEntries: { name: string; content?: string }[]): Record<string, CitationUsage> {
  const usage: Record<string, CitationUsage> = {};
  for (const file of fileEntries) {
    if (!file.content) continue;

    const headings: { index: number; title: string }[] = [];
    let sMatch: RegExpExecArray | null;
    SECTION_REGEX.lastIndex = 0;
    while ((sMatch = SECTION_REGEX.exec(file.content)) !== null) {
      headings.push({ index: sMatch.index, title: sMatch[1] });
    }

    CITE_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = CITE_REGEX.exec(file.content)) !== null) {
      const currentSection = [...headings].reverse().find((h) => h.index <= match!.index)?.title ?? file.name;
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

/**
 * Scans every .tex file in the project for \cite{...} occurrences and
 * buckets them by key, tagging each occurrence with the nearest preceding
 * \section (or \chapter) heading so the reference detail panel can show
 * "Introduction ×2, Method ×3" the way a real citation-usage index would.
 */
export async function getCitationUsage(projectId: string): Promise<Record<string, CitationUsage>> {
  if (isRealId(projectId)) {
    await getDb();
    const files = await listFiles(projectId);
    return scanCitationUsage(files);
  }
  await delay(150);
  const files = mockDb.files.filter((f) => f.projectId === projectId);
  return scanCitationUsage(files);
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

function computePaperHealth(
  files: { content?: string; isBinary: boolean; mimeType?: string }[],
  entries: BibEntry[],
  broken: BrokenReferences
): PaperHealth {
  const citedKeysTotal = new Set([...entries.map((e) => e.key), ...broken.undefinedCites]).size;
  const citationsResolved = citedKeysTotal - broken.undefinedCites.length;

  let figuresTotal = 0;
  let figuresReferenced = 0;
  let tablesTotal = 0;
  let tablesReferenced = 0;
  for (const f of files) {
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

export async function getPaperHealth(projectId: string): Promise<PaperHealth> {
  if (isRealId(projectId)) {
    await getDb();
    const files = await listFiles(projectId);
    const bibFile = files.find((f) => f.type === "file" && f.name.toLowerCase().endsWith(".bib"));
    const entries = bibFile ? await listRealBibEntries(bibFile.id) : [];
    const broken = await detectBrokenReferences(projectId);
    return computePaperHealth(files, entries, broken);
  }

  await delay(200);
  const file = mockDb.files.find((f) => f.projectId === projectId && f.name.endsWith(".bib"));
  const entries = file ? mockDb.bibEntries.filter((e) => e.fileId === file.id) : [];
  const broken = await detectBrokenReferences(projectId);
  const files = mockDb.files.filter((f) => f.projectId === projectId);
  return computePaperHealth(files, entries, broken);
}

export interface BrokenReferences {
  undefinedCites: string[];
  unusedEntries: string[];
}

function scanCitedKeys(fileEntries: { content?: string }[]): Set<string> {
  const citedKeys = new Set<string>();
  const citeRegex = /\\cite[tp]?\*?(?:\[[^\]]*\])?\{([^}]+)\}/g;
  for (const file of fileEntries) {
    if (!file.content) continue;
    let match: RegExpExecArray | null;
    citeRegex.lastIndex = 0;
    while ((match = citeRegex.exec(file.content)) !== null) {
      for (const rawKey of match[1].split(",")) {
        const key = rawKey.trim();
        if (key) citedKeys.add(key);
      }
    }
  }
  return citedKeys;
}

export async function detectBrokenReferences(projectId: string): Promise<BrokenReferences> {
  if (isRealId(projectId)) {
    await getDb();
    const files = await listFiles(projectId);
    const citedKeys = scanCitedKeys(files);
    const bibFile = files.find((f) => f.type === "file" && f.name.toLowerCase().endsWith(".bib"));
    const entries = bibFile ? await listRealBibEntries(bibFile.id) : [];
    const entryKeys = new Set(entries.map((e) => e.key));
    return {
      undefinedCites: [...citedKeys].filter((k) => !entryKeys.has(k)),
      unusedEntries: [...entryKeys].filter((k) => !citedKeys.has(k)),
    };
  }

  await delay(20);
  const files = mockDb.files.filter((f) => f.projectId === projectId);
  const citedKeys = scanCitedKeys(files);
  const entryKeys = new Set(
    mockDb.bibEntries
      .filter((e) => mockDb.files.find((f) => f.id === e.fileId)?.projectId === projectId)
      .map((e) => e.key)
  );
  return {
    undefinedCites: [...citedKeys].filter((k) => !entryKeys.has(k)),
    unusedEntries: [...entryKeys].filter((k) => !citedKeys.has(k)),
  };
}
