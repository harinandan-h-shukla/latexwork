import { EditorWorkspace } from "@/components/workspace/editor-workspace";

export default async function ProjectEditorPage(props: PageProps<"/projects/[projectId]">) {
  const { projectId } = await props.params;

  return <EditorWorkspace projectId={projectId} />;
}
