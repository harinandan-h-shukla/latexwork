import { Reveal } from "@/components/marketing/reveal";
import { PaperStructureMockup } from "@/components/marketing/mockups/paper-structure-mockup";

const PARTS = [
  { label: "Manuscript", description: "The file tree that holds your source, organized however you like." },
  { label: "References", description: "A dedicated workspace for your bibliography, not a stray .bib file." },
  { label: "Figures & data", description: "Images, plots, and CSVs live beside the paper that uses them." },
  { label: "Review", description: "Comments and tracked changes, anchored to the text they discuss." },
  { label: "Versions", description: "Every snapshot of the project, ready to diff or restore." },
];

export function PaperStructureSection() {
  return (
    <section id="structure" className="mx-auto w-full max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Your paper is more than a .tex file.
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            A research project is a manuscript, a bibliography, a set of
            figures, a review thread, and a history of every version —
            Inkwell keeps all of it in one place instead of scattering it
            across an editor, a reference manager, and an email thread.
          </p>
          <ul className="mt-6 flex flex-col gap-3 text-sm">
            {PARTS.map((p) => (
              <li key={p.label} className="flex items-start gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  <span className="font-medium text-foreground">{p.label}</span>
                  <span className="text-muted-foreground"> — {p.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={100}>
          <PaperStructureMockup className="w-full" />
        </Reveal>
      </div>
    </section>
  );
}
