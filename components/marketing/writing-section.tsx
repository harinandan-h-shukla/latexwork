import { Reveal } from "@/components/marketing/reveal";
import { LatexEditingMockup } from "@/components/marketing/mockups/latex-editing-mockup";

export function WritingSection() {
  return (
    <section id="writing" className="mx-auto w-full max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Writing is one part of the process.
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            The editor itself is a serious one — syntax highlighting,
            autocomplete for commands and citation keys, snippet expansion,
            and pre-compile error checks that catch a duplicate label before
            you waste a compile on it. It just doesn&apos;t have to be the
            whole product.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <LatexEditingMockup className="mx-auto w-full max-w-md" />
        </Reveal>
      </div>
    </section>
  );
}
