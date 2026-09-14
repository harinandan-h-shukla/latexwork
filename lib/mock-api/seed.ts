import type { Collaborator, Project, Template, User } from "@/lib/types";
import { CURRENT_USER_ID, mockDb } from "@/lib/mock-api/db";

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function defaultEditorDefaults() {
  return {
    keybinding: "default" as const,
    theme: "default",
    fontSize: 14,
    tabSize: 2,
    autocomplete: true,
    wordWrap: true,
    lineNumbers: true,
    compilerPreference: "prefer-local" as const,
  };
}

function makeUser(partial: Partial<User> & Pick<User, "id" | "name" | "email">): User {
  return {
    avatarUrl: undefined,
    createdAt: daysAgo(400),
    twoFactorEnabled: false,
    linkedAccounts: [],
    editorDefaults: defaultEditorDefaults(),
    planTier: "free",
    storageQuotaBytes: 1024 * 1024 * 1024,
    storageUsedBytes: 0,
    ...partial,
  };
}

const users: User[] = [
  makeUser({
    id: CURRENT_USER_ID,
    name: "Harinandan Shukla",
    email: "harinandan_s@cs.iitr.ac.in",
    planTier: "pro",
    storageUsedBytes: 312 * 1024 * 1024,
    storageQuotaBytes: 5 * 1024 * 1024 * 1024,
    linkedAccounts: [
      { provider: "google", connectedAt: daysAgo(120), externalId: "g_9f21", externalEmail: "harinandan_s@cs.iitr.ac.in" },
    ],
    privacyPrefs: { indexPublicProjects: false, shareUsageAnalytics: true },
  }),
  makeUser({ id: "user_aditi", name: "Aditi Rao", email: "aditi.rao@example.edu", storageUsedBytes: 40 * 1024 * 1024 }),
  makeUser({ id: "user_marco", name: "Marco Dias", email: "marco.dias@example.edu", storageUsedBytes: 88 * 1024 * 1024 }),
  makeUser({ id: "user_lin", name: "Lin Wei", email: "lin.wei@example.edu", storageUsedBytes: 12 * 1024 * 1024 }),
];

function projectSettings(overrides?: Partial<Project["settings"]>): Project["settings"] {
  return {
    compiler: "pdflatex",
    texLiveVersion: "2025",
    mainFileId: null,
    spellCheckLanguage: "en-US",
    autoCompile: true,
    compileTimeoutSeconds: 90,
    draftMode: false,
    shellEscape: false,
    ...overrides,
  };
}

function makeProject(partial: Partial<Project> & Pick<Project, "id" | "name">): Project {
  return {
    ownerId: CURRENT_USER_ID,
    folderId: null,
    tags: [],
    starred: false,
    archived: false,
    trashed: false,
    trashedAt: null,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2),
    settings: projectSettings(),
    storageUsedBytes: 2 * 1024 * 1024,
    visibility: "private",
    publicReadOnlyLink: null,
    ...partial,
  };
}

const projects: Project[] = [
  makeProject({
    id: "proj_neurips",
    name: "NeurIPS 2026 Submission",
    tags: ["paper", "deadline"],
    starred: true,
    createdAt: daysAgo(45),
    updatedAt: daysAgo(1),
    storageUsedBytes: 6 * 1024 * 1024,
  }),
  makeProject({
    id: "proj_grant",
    name: "SERB Grant Proposal",
    tags: ["grant"],
    createdAt: daysAgo(90),
    updatedAt: daysAgo(10),
    storageUsedBytes: 3 * 1024 * 1024,
  }),
  makeProject({
    id: "proj_cv",
    name: "Academic CV",
    tags: ["resume"],
    createdAt: daysAgo(300),
    updatedAt: daysAgo(20),
    storageUsedBytes: 512 * 1024,
  }),
  makeProject({
    id: "proj_slides",
    name: "Group Meeting Slides",
    tags: ["slides"],
    createdAt: daysAgo(15),
    updatedAt: daysAgo(3),
    storageUsedBytes: 4 * 1024 * 1024,
  }),
  makeProject({
    id: "proj_shared_iclr",
    name: "ICLR Rebuttal (shared)",
    ownerId: "user_aditi",
    tags: ["paper", "collab"],
    createdAt: daysAgo(60),
    updatedAt: daysAgo(1),
    storageUsedBytes: 5 * 1024 * 1024,
  }),
  makeProject({
    id: "proj_letter",
    name: "Recommendation Letter Template",
    tags: ["letter"],
    createdAt: daysAgo(150),
    updatedAt: daysAgo(150),
    storageUsedBytes: 128 * 1024,
  }),
  makeProject({
    id: "proj_old_paper",
    name: "2023 Workshop Paper",
    tags: ["paper", "archive"],
    archived: true,
    createdAt: daysAgo(500),
    updatedAt: daysAgo(400),
    storageUsedBytes: 3 * 1024 * 1024,
  }),
  makeProject({
    id: "proj_draft_notes",
    name: "Untitled Draft",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
    storageUsedBytes: 64 * 1024,
  }),
  makeProject({
    id: "proj_trashed_1",
    name: "Old Cover Letter",
    tags: ["letter"],
    trashed: true,
    trashedAt: daysAgo(4),
    createdAt: daysAgo(120),
    updatedAt: daysAgo(4),
    storageUsedBytes: 96 * 1024,
  }),
  makeProject({
    id: "proj_trashed_2",
    name: "Duplicate Thesis Backup",
    tags: ["thesis"],
    trashed: true,
    trashedAt: daysAgo(1),
    createdAt: daysAgo(200),
    updatedAt: daysAgo(1),
    storageUsedBytes: 17 * 1024 * 1024,
  }),
];

const collaborators: Collaborator[] = [
  { userId: CURRENT_USER_ID, projectId: "proj_shared_iclr", role: "editor", addedAt: daysAgo(60) },
  { userId: "user_aditi", projectId: "proj_shared_iclr", role: "owner", addedAt: daysAgo(60) },
  { userId: "user_marco", projectId: "proj_shared_iclr", role: "reviewer", addedAt: daysAgo(30) },
  { userId: "user_aditi", projectId: "proj_neurips", role: "editor", addedAt: daysAgo(40) },
  { userId: "user_lin", projectId: "proj_neurips", role: "viewer", addedAt: daysAgo(20) },
];

const templates: Template[] = [
  {
    id: "tpl_ieee_conf",
    name: "IEEE Conference Paper",
    category: "journal",
    publisher: "IEEE",
    description: "Two-column IEEE conference format with standard sections.",
    thumbnailUrl: "/templates/ieee-conf.svg",
    sourceProjectId: "seed_ieee_conf",
    isOwn: false,
  },
  {
    id: "tpl_arxiv_preprint",
    name: "arXiv Preprint",
    category: "journal",
    publisher: "arXiv",
    description: "Standard single-column preprint layout with numbered citations (natbib).",
    thumbnailUrl: "/templates/arxiv-preprint.svg",
    sourceProjectId: "seed_arxiv_preprint",
    isOwn: false,
  },
  {
    id: "tpl_acm_sigconf",
    name: "ACM SIGCONF Proceedings",
    category: "journal",
    publisher: "ACM",
    description: "ACM master article template, sigconf format.",
    thumbnailUrl: "/templates/acm-sigconf.svg",
    sourceProjectId: "seed_acm_sigconf",
    isOwn: false,
  },
  {
    id: "tpl_springer_lncs",
    name: "Springer LNCS",
    category: "journal",
    publisher: "Springer",
    description: "Lecture Notes in Computer Science single-column layout.",
    thumbnailUrl: "/templates/springer-lncs.svg",
    sourceProjectId: "seed_springer_lncs",
    isOwn: false,
  },
  {
    id: "tpl_neurips",
    name: "NeurIPS Submission",
    category: "journal",
    publisher: "NeurIPS",
    description: "Official NeurIPS style with anonymized submission mode.",
    thumbnailUrl: "/templates/neurips.svg",
    sourceProjectId: "seed_neurips",
    isOwn: false,
  },
  {
    id: "tpl_phd_thesis",
    name: "University PhD Thesis",
    category: "thesis",
    description: "Chaptered thesis template with front matter and appendices.",
    thumbnailUrl: "/templates/phd-thesis.svg",
    sourceProjectId: "seed_phd_thesis",
    isOwn: false,
  },
  {
    id: "tpl_masters_thesis",
    name: "Master's Thesis (Compact)",
    category: "thesis",
    description: "Shorter thesis structure for master's dissertations.",
    thumbnailUrl: "/templates/masters-thesis.svg",
    sourceProjectId: "seed_masters_thesis",
    isOwn: false,
  },
  {
    id: "tpl_modern_cv",
    name: "Modern CV",
    category: "resume",
    description: "Clean two-column academic CV with publication list.",
    thumbnailUrl: "/templates/modern-cv.svg",
    sourceProjectId: "seed_modern_cv",
    isOwn: false,
  },
  {
    id: "tpl_beamer_default",
    name: "Beamer Presentation",
    category: "presentation",
    description: "Beamer deck with title slide, sections, and Madrid theme.",
    thumbnailUrl: "/templates/beamer-default.svg",
    sourceProjectId: "seed_beamer_default",
    isOwn: false,
  },
  {
    id: "tpl_cover_letter",
    name: "Formal Cover Letter",
    category: "letter",
    description: "Business-formal letter layout with letterhead block.",
    thumbnailUrl: "/templates/cover-letter.svg",
    sourceProjectId: "seed_cover_letter",
    isOwn: false,
  },
];

export function seedMockDb(): void {
  if (mockDb.users.length > 0) return;
  mockDb.users.push(...users);
  mockDb.projects.push(...projects);
  mockDb.templates.push(...templates);
  mockDb.collaborators.push(...collaborators);
}
