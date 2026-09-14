import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongoose";
import { ProjectModel, CollaboratorModel } from "@/lib/db/models/project";
import { requireUserId } from "@/lib/db/require-user";
import { getBinaryFileStream } from "@/lib/storage/blob-storage";

// Same shape as app/api/files/[fileId]/blob — a user-chosen project cover
// image, private-Blob-backed, so this authenticated route is the only way
// to actually read it.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  await getDb();
  const project = await ProjectModel.findById(projectId).select("ownerId thumbnailBlobPathname");
  if (!project || !project.thumbnailBlobPathname) {
    return NextResponse.json({ error: "No thumbnail set." }, { status: 404 });
  }
  const isOwner = String(project.ownerId) === userId;
  const isCollaborator = isOwner ? true : await CollaboratorModel.exists({ projectId, userId } as never);
  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "No thumbnail set." }, { status: 404 });
  }

  const result = await getBinaryFileStream(project.thumbnailBlobPathname);
  if (!result) {
    return NextResponse.json({ error: "Thumbnail not found in storage." }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.contentType || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
