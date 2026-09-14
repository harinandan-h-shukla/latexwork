"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, CompassIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { ResearchPipelineMockup } from "@/components/marketing/mockups/research-pipeline-mockup";
import { isAuthenticated } from "@/lib/client-session";

export function Hero() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (() => setAuthed(isAuthenticated()))();
  }, []);

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 -z-10 h-[560px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent"
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-10 px-4 pt-16 pb-8 text-center sm:px-6 sm:pt-24">
        <Reveal>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            A research workspace, not just an editor
          </span>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="max-w-3xl text-balance font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Research, without the friction.
          </h1>
        </Reveal>

        <Reveal delay={140}>
          <p className="max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Discover papers, build your bibliography, write in LaTeX,
            collaborate with your team, and compile locally or in the cloud —
            all in one workspace built around the paper, not just the file.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            {authed ? (
              <>
                <Button
                  size="lg"
                  variant="cta"
                  className="h-11 gap-2 rounded-xl px-6 text-base"
                  nativeButton={false}
                  render={<Link href="/projects" />}
                >
                  Go to dashboard
                  <ArrowRightIcon className="size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 gap-2 rounded-xl px-6 text-base"
                  nativeButton={false}
                  render={<Link href="#structure" />}
                >
                  <CompassIcon className="size-4" />
                  Explore the workspace
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  className="h-11 gap-2 rounded-xl px-6 text-base"
                  nativeButton={false}
                  render={<Link href="/signup" />}
                >
                  Start a Research Workspace
                  <ArrowRightIcon className="size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 rounded-xl px-6 text-base"
                  nativeButton={false}
                  render={<Link href="/login" />}
                >
                  Log in
                </Button>
              </>
            )}
          </div>
        </Reveal>

        <Reveal delay={260} className="w-full">
          <div className="relative mx-auto mt-6 w-full max-w-5xl">
            <div
              aria-hidden
              className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-b from-primary/5 to-transparent blur-2xl"
            />
            <ResearchPipelineMockup className="w-full" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
