import { Reveal } from "@/components/marketing/reveal";

export function AboutSection() {
  return (
    <section id="about" className="mx-auto w-full max-w-3xl scroll-mt-16 px-4 py-20 text-center sm:px-6">
      <Reveal>
        <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Research should be about ideas, not tool switching.
        </h2>
        <p className="mt-5 text-pretty text-muted-foreground">
          Inkwell brings discovery, references, writing, review,
          collaboration, and compilation into one workspace — so a paper
          moves from an open question to a submission without living across
          five different tools. It is built on the same core functions
          researchers already rely on, with a modern editor, an honest
          reference workspace, and a compile status you can actually see the
          state of, locally or in the cloud.
        </p>
      </Reveal>
    </section>
  );
}
