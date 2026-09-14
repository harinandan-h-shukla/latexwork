import { Suspense } from "react";
import { ReferencesWorkspace } from "@/components/references/references-workspace";
import { resolveProjectForPage } from "@/lib/db/resolve-project-for-page";

export default async function ReferencesPage(
  props: PageProps<"/projects/[projectId]/references">
) {
  const { projectId } = await props.params;
  const { projectId: effectiveProjectId } = await resolveProjectForPage(projectId);

  return (
    <div className="mx-auto h-full max-w-6xl overflow-auto px-4 py-6 sm:px-6 lg:px-8">
      <Suspense>
        <ReferencesWorkspace projectId={effectiveProjectId} />
      </Suspense>
    </div>
  );
}
