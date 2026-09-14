"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { isAuthenticated } from "@/lib/client-session";

export function FinalCta() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (() => setAuthed(isAuthenticated()))();
  }, []);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-muted/30 to-transparent px-6 py-16 text-center sm:px-12 sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(40%_60%_at_50%_0%,var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent"
          />
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Build your next paper here.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-pretty text-muted-foreground">
            Start a workspace, bring in your references, invite your
            co-authors, and write toward a submission — not just a document.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {authed ? (
              <Button
                size="lg"
                className="h-11 gap-2 rounded-xl px-6 text-base"
                nativeButton={false}
                render={<Link href="/projects" />}
              >
                Go to dashboard
                <ArrowRightIcon className="size-4" />
              </Button>
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
        </div>
      </Reveal>
    </section>
  );
}
