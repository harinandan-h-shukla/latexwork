import "server-only";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/mock-api/projects";

/**
 * When the id in the URL doesn't resolve to a real project this user can
 * access (bad link, stale bookmark, someone else's project), show a real
 * 404 instead of silently falling back to another project's content.
 */
export async function resolveProjectForPage(
  projectId: string,
): Promise<{ projectId: string; projectName: string }> {
  try {
    const project = await getProject(projectId);
    return { projectId: project.id, projectName: project.name };
  } catch {
    notFound();
  }
}
