import {
  ArchiveIcon,
  FileTextIcon,
  GraduationCapIcon,
  NotebookPenIcon,
  PresentationIcon,
  SendIcon,
  UsersIcon,
} from "lucide-react";

import { Reveal } from "@/components/marketing/reveal";

const USE_CASES = [
  { icon: FileTextIcon, title: "Research papers", description: "Draft and revise manuscripts with your co-authors, in the same document." },
  { icon: GraduationCapIcon, title: "Thesis writing", description: "Manage chapters, figures, and a growing bibliography over months of work." },
  { icon: SendIcon, title: "Conference submissions", description: "Work against a deadline with a compile queue you can actually see." },
  { icon: ArchiveIcon, title: "Journal manuscripts", description: "Match publisher formatting requirements without fighting your editor." },
  { icon: PresentationIcon, title: "Technical reports", description: "Keep internal reports and their source data in one organized project." },
  { icon: UsersIcon, title: "Collaborative projects", description: "Grant reviewer, editor, or viewer access without emailing a PDF back and forth." },
  { icon: NotebookPenIcon, title: "Notes and experiments", description: "Capture early-stage writing before it becomes a formal document." },
];

export function ResearchUseCases() {
  return (
    <section id="research" className="mx-auto w-full max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Built for serious research
        </h2>
        <p className="mt-3 text-pretty text-muted-foreground">
          Whatever stage the writing is at, it fits in the same workspace.
        </p>
      </Reveal>

      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {USE_CASES.map((u, i) => (
          <Reveal key={u.title} delay={(i % 4) * 60}>
            <div className="flex h-full flex-col gap-2 rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-border">
              <u.icon className="size-4.5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{u.title}</h3>
              <p className="text-sm text-muted-foreground">{u.description}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
