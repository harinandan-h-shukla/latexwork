import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongoose";
import { ProjectFileModel, ProjectModel, CollaboratorModel } from "@/lib/db/models/project";
import { requireUserId } from "@/lib/db/require-user";
import { getBinaryFileStream } from "@/lib/storage/blob-storage";

// The other deliberate app/api route in this codebase (alongside
// cloud-compile's PDF proxy) — same reason: streaming binary content isn't
// a good fit for a Server Action. Private Vercel Blob access means every
// fetch has to go through here rather than a direct blob URL, which is
// what actually enforces "only someone who can open this project can see
// its figures" instead of "anyone who has/guesses the URL."
export async function GET(_req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  await getDb();
  const file = await ProjectFileModel.findById(fileId).select("projectId isBinary mimeType blobPathname");
  if (!file || !file.isBinary || !file.blobPathname) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const project = await ProjectModel.findById(file.projectId).select("ownerId");
  if (!project) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  const isOwner = String(project.ownerId) === userId;
  const isCollaborator = isOwner
    ? true
    : await CollaboratorModel.exists({ projectId: file.projectId, userId } as never);
  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const result = await getBinaryFileStream(file.blobPathname);
  if (!result) {
    return NextResponse.json({ error: "File not found in storage." }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": file.mimeType || result.contentType || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
