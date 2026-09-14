import { Suspense } from "react";
import { ResearchWorkspace } from "@/components/research/research-workspace";
import { resolveProjectForPage } from "@/lib/db/resolve-project-for-page";

export default async function ResearchPage(props: PageProps<"/projects/[projectId]/research">) {
  const { projectId } = await props.params;
  const { projectId: effectiveProjectId } = await resolveProjectForPage(projectId);

  return (
    <div className="mx-auto h-full max-w-6xl overflow-auto px-4 py-6 sm:px-6 lg:px-8">
      <Suspense>
        <ResearchWorkspace projectId={effectiveProjectId} />
      </Suspense>
    </div>
  );
}
