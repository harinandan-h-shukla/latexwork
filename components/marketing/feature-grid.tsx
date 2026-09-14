import {
  BookMarkedIcon,
  ClipboardCheckIcon,
  PenLineIcon,
  SearchIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Reveal } from "@/components/marketing/reveal";

const FEATURES = [
  {
    icon: PenLineIcon,
    title: "Write",
    description:
      "A LaTeX editor with syntax highlighting, autocomplete, snippets, and an outline sidebar — built on CodeMirror 6.",
  },
  {
    icon: SearchIcon,
    title: "Discover",
    description:
      "Search for relevant literature and pull papers straight into your research library as you write.",
    accent: true,
  },
  {
    icon: BookMarkedIcon,
    title: "References",
    description:
      "A structured .bib editor with citation autocomplete, duplicate-key and broken-reference detection.",
  },
  {
    icon: UsersIcon,
    title: "Collaborate",
    description:
      "Live cursors, threaded comments, and track changes — your co-authors and advisor, in the same document.",
  },
  {
    icon: ClipboardCheckIcon,
    title: "Review",
    description:
      "Catch unresolved citations, unused references, and broken links before they reach a reviewer.",
  },
  {
    icon: ZapIcon,
    title: "Compile",
    description:
      "Compile locally in milliseconds, or hand it to the cloud queue — with a log you can actually read.",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="mx-auto w-full max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Everything around your paper
        </h2>
        <p className="mt-3 text-pretty text-muted-foreground">
          Inkwell isn&apos;t only where you type LaTeX — it&apos;s where a
          paper moves from an open question to a submission.
        </p>
      </Reveal>

      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 60}>
            <div className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-border-strong">
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg transition-transform group-hover:scale-105",
                  f.accent
                    ? "bg-secondary-soft text-secondary-accent"
                    : "bg-primary-soft text-primary",
                )}
              >
                <f.icon className="size-4.5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-text-secondary">{f.description}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
