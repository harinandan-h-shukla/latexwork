import { ProjectWorkspaceGate } from "@/components/workspace/project-workspace-gate";
import { resolveProjectForPage } from "@/lib/db/resolve-project-for-page";

export default async function ProjectEditorPage(props: PageProps<"/projects/[projectId]">) {
  const { projectId } = await props.params;
  const { projectId: effectiveProjectId } = await resolveProjectForPage(projectId);

  return <ProjectWorkspaceGate projectId={effectiveProjectId} />;
}
