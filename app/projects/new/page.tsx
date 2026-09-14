import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { NewProjectFlow } from "@/components/projects/new-project-flow";

export default function NewProjectPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/projects"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" /> Back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
        <p className="text-sm text-muted-foreground">
          Start a blank project, use a template, or import an existing one.
        </p>
      </div>

      <NewProjectFlow />
    </div>
  );
}
