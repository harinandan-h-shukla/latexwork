import {
  BookmarkPlusIcon,
  QuoteIcon,
  SearchIcon,
  ShieldCheckIcon,
  TelescopeIcon,
} from "lucide-react";

import { Reveal } from "@/components/marketing/reveal";

const STEPS = [
  { icon: SearchIcon, title: "Search", description: "Look up a paper by title, author, or DOI." },
  { icon: TelescopeIcon, title: "Inspect", description: "Read the abstract and metadata before you commit to it." },
  { icon: ShieldCheckIcon, title: "Verify", description: "Confirm the citation details are complete and correct." },
  { icon: BookmarkPlusIcon, title: "Add to library", description: "Save it to your project's reference collection." },
  { icon: QuoteIcon, title: "Cite", description: "Insert \\cite{} at the cursor, key already autocompleted." },
];

export function CitationWorkflowSection() {
  return (
    <section id="citations" className="mx-auto w-full max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          From a search result to a citation key
        </h2>
        <p className="mt-3 text-pretty text-muted-foreground">
          Every citation follows the same short path — no separate reference
          manager, no copy-pasting a BibTeX block from another tab.
        </p>
      </Reveal>

      <div className="relative mt-14">
        <div
          aria-hidden
          className="absolute top-9 right-[8%] left-[8%] hidden h-px bg-border md:block"
        />
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-5">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 70}>
              <div className="relative flex flex-col items-center gap-3 text-center">
                <div className="relative z-10 flex size-11 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm">
                  <step.icon className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Step {i + 1}</p>
                  <h3 className="mt-0.5 text-sm font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
