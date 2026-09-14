import { Reveal } from "@/components/marketing/reveal";
import { PaperSearchMockup } from "@/components/marketing/mockups/paper-search-mockup";

export function ResearchDiscoverySection() {
  return (
    <section id="discovery" className="mx-auto w-full max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <Reveal className="order-2 lg:order-1">
          <PaperSearchMockup className="w-full" />
        </Reveal>

        <Reveal delay={100} className="order-1 lg:order-2">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Find the work your paper builds on.
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Search for related literature without leaving your project, and
            pull a result straight into your research library — ready to
            inspect, verify, and cite. The search above shows example results
            to illustrate the flow.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
