import { Reveal } from "@/components/marketing/reveal";
import { PaperHealthMockup } from "@/components/marketing/mockups/paper-health-mockup";

export function PaperHealthSection() {
  return (
    <section id="review" className="mx-auto w-full max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <Reveal className="order-2 lg:order-1">
          <PaperHealthMockup className="w-full" />
        </Reveal>

        <Reveal delay={100} className="order-1 lg:order-2">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Know your paper is submission-ready.
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Duplicate citation keys and broken or missing references get
            flagged as you write, not discovered in a reviewer&apos;s
            comment. The panel above illustrates the kind of checklist a
            finished review pass produces.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
