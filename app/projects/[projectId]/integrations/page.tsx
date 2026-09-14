import { IntegrationsWorkspace } from "./_components/integrations-workspace";
import { resolveProjectForPage } from "@/lib/db/resolve-project-for-page";

export default async function IntegrationsPage(
  props: PageProps<"/projects/[projectId]/integrations">
) {
  const { projectId } = await props.params;
  const { projectId: effectiveProjectId } = await resolveProjectForPage(projectId);

  return (
    <div className="mx-auto h-full max-w-5xl overflow-auto px-4 py-6 sm:px-6 lg:px-8">
      <IntegrationsWorkspace projectId={effectiveProjectId} />
    </div>
  );
}
