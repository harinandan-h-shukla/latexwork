import type { FileSnapshot, Version } from "@/lib/types";
import { CURRENT_USER_ID, delay, id, mockDb } from "@/lib/mock-api/db";
import { seedMockDb } from "@/lib/mock-api/seed";

// See collaboration.ts for the same fix — seeding a canned demo timeline for
// ANY project id meant every real project's Versions tab showed the same
// generic "Ready for review" / "First full draft" history that wasn't
// actually theirs.
const RICH_DEMO_PROJECT_ID = "proj_thesis";

function now(): string {
  return new Date().toISOString();
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

/**
 * File ownership for lib/mock-api/files.ts belongs to another agent, so mockDb.files may not be
 * seeded yet for this project when the History tab is opened directly. Read whatever real content
 * is there; fall back to a plausible starter file otherwise.
 */
function projectFileSnapshots(projectId: string): FileSnapshot[] {
  const real = mockDb.files.filter(
    (f) => f.projectId === projectId && f.type === "file" && !f.isBinary
  );
  if (real.length > 0) {
    return real.map((f) => ({ fileId: f.id, path: f.path, content: f.content ?? "" }));
  }
  return [
    {
      fileId: `file_main_${projectId}`,
      path: "/main.tex",
      content:
        "\\documentclass{article}\n\\usepackage{amsmath}\n\\title{Untitled}\n\\author{}\n\\begin{document}\n\\maketitle\n\n\\section{Introduction}\n\nStart writing here.\n\n\\end{document}\n",
    },
  ];
}

function demoAuthor(projectId: string): string {
  const collaborator = mockDb.collaborators.find(
    (c) => c.projectId === projectId && c.userId !== CURRENT_USER_ID
  );
  return collaborator?.userId ?? "user_aditi";
}

function growContent(content: string, fraction: number): string {
  const lines = content.split("\n");
  const keep = Math.max(1, Math.round(lines.length * fraction));
  return lines.slice(0, keep).join("\n");
}

const seededHistory = new Set<string>();

function seedVersions(projectId: string): void {
  if (projectId !== RICH_DEMO_PROJECT_ID) return;
  if (seededHistory.has(projectId)) return;
  seededHistory.add(projectId);
  // Defense in depth against a dev-server hot-reload resetting this
  // in-memory Set independently of the shared mockDb singleton, which would
  // otherwise silently re-push a duplicate copy of every seeded version.
  if (mockDb.versions.some((v) => v.projectId === projectId)) return;

  const files = projectFileSnapshots(projectId);
  const otherAuthor = demoAuthor(projectId);

  const timeline: Array<{
    daysBack: number;
    isAuto: boolean;
    label: string | null;
    message: string | null;
    authorId: string;
  }> = [
    { daysBack: 21, isAuto: true, label: null, message: null, authorId: CURRENT_USER_ID },
    { daysBack: 14, isAuto: true, label: null, message: null, authorId: otherAuthor },
    {
      daysBack: 9,
      isAuto: false,
      label: "First full draft",
      message: "All sections drafted, pending citations.",
      authorId: CURRENT_USER_ID,
    },
    { daysBack: 5, isAuto: true, label: null, message: null, authorId: CURRENT_USER_ID },
    { daysBack: 2, isAuto: true, label: null, message: null, authorId: otherAuthor },
    {
      daysBack: 0,
      isAuto: false,
      label: "Ready for review",
      message: "Incorporated feedback from the last meeting.",
      authorId: CURRENT_USER_ID,
    },
  ];

  const versions: Version[] = timeline.map((t, i) => {
    const fraction = (i + 1) / timeline.length;
    return {
      id: id("version"),
      projectId,
      label: t.label,
      message: t.message,
      authorId: t.authorId,
      createdAt: daysAgo(t.daysBack),
      isAutoSnapshot: t.isAuto,
      fileSnapshots: files.map((f) => ({ ...f, content: growContent(f.content, fraction) })),
    };
  });

  mockDb.versions.push(...versions);
}

export async function listVersions(projectId: string): Promise<Version[]> {
  seedMockDb();
  seedVersions(projectId);
  await delay(20);
  return mockDb.versions
    .filter((v) => v.projectId === projectId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveVersion(
  projectId: string,
  label: string,
  message?: string
): Promise<Version> {
  seedMockDb();
  await delay(400);
  const version: Version = {
    id: id("version"),
    projectId,
    label,
    message: message ?? null,
    authorId: CURRENT_USER_ID,
    createdAt: now(),
    isAutoSnapshot: false,
    fileSnapshots: projectFileSnapshots(projectId),
  };
  mockDb.versions.push(version);
  return version;
}

export async function restoreVersion(
  versionId: string,
  options?: { fileId?: string }
): Promise<void> {
  await delay(500);
  const version = mockDb.versions.find((v) => v.id === versionId);
  if (!version) throw new Error("Version not found");
  // Mock only: Phase 2 will write the snapshot's content back into the live project/session.
  void options;
}

export async function getVersionDiff(
  versionAId: string,
  versionBId: string
): Promise<Array<{ path: string; aContent: string; bContent: string }>> {
  await delay(350);
  const a = mockDb.versions.find((v) => v.id === versionAId);
  const b = mockDb.versions.find((v) => v.id === versionBId);
  if (!a || !b) throw new Error("Version not found");

  const paths = new Set<string>([
    ...a.fileSnapshots.map((f) => f.path),
    ...b.fileSnapshots.map((f) => f.path),
  ]);

  return Array.from(paths).map((path) => ({
    path,
    aContent: a.fileSnapshots.find((f) => f.path === path)?.content ?? "",
    bContent: b.fileSnapshots.find((f) => f.path === path)?.content ?? "",
  }));
}
