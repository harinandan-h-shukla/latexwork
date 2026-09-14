import { OverviewWorkspace } from "@/components/workspace/overview-workspace";
import { resolveProjectForPage } from "@/lib/db/resolve-project-for-page";

export default async function OverviewPage(props: PageProps<"/projects/[projectId]/overview">) {
  const { projectId } = await props.params;
  const { projectId: effectiveProjectId, projectName } = await resolveProjectForPage(projectId);

  return (
    <div className="mx-auto h-full max-w-6xl overflow-auto px-4 py-6 sm:px-6 lg:px-8">
      <OverviewWorkspace projectId={effectiveProjectId} projectName={projectName} />
    </div>
  );
}
