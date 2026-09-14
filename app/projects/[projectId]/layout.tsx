import { ProjectTopbar } from "@/components/workspace/project-topbar";
import { getProject } from "@/lib/mock-api/projects";

export default async function ProjectLayout(props: LayoutProps<"/projects/[projectId]">) {
  const { projectId } = await props.params;

  const projectName = await getProject(projectId)
    .then((p) => p.name)
    .catch(() => "Untitled project");

  return (
    <div className="flex h-dvh min-h-0 flex-col">
      <ProjectTopbar projectId={projectId} projectName={projectName} />
      <div className="min-h-0 flex-1">{props.children}</div>
    </div>
  );
}
