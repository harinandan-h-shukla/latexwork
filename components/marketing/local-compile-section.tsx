import { Reveal } from "@/components/marketing/reveal";
import { LocalCompileMockup } from "@/components/marketing/mockups/local-compile-mockup";

export function LocalCompileSection() {
  return (
    <section id="compile" className="relative scroll-mt-16 overflow-hidden py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(50%_50%_at_50%_20%,var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"
      />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Compile on your machine. Really.
            </h2>
            <p className="mt-4 text-pretty text-muted-foreground">
              Install the local agent once, and Inkwell compiles against your
              own TeX Live install instead of waiting in a shared cloud
              queue — in milliseconds, not minutes, with no queue position
              to watch. Prefer the cloud? It&apos;s still there, with a
              compile log you can actually read.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <LocalCompileMockup className="mx-auto w-full max-w-sm" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
