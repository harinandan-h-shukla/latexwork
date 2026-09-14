import type { ReactNode } from "react";
import {
  BadgeCheckIcon,
  BookMarkedIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileTextIcon,
  MessageCircleIcon,
  QuoteIcon,
  ScaleIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STAGES: {
  label: string;
  icon: typeof BookMarkedIcon;
  content: ReactNode;
}[] = [
  {
    label: "Research library",
    icon: BookMarkedIcon,
    content: (
      <div className="flex flex-col gap-1 text-left">
        <p className="truncate text-[11px] font-medium text-foreground">
          Distribution Alignment for Long-Tailed Regression
        </p>
        <p className="truncate text-[10px] text-muted-foreground">Yang et al. · NeurIPS 2024</p>
      </div>
    ),
  },
  {
    label: "Reference",
    icon: QuoteIcon,
    content: (
      <div className="flex flex-col items-start gap-1 text-left">
        <span className="font-mono text-[11px] text-foreground">\cite{"{"}yang2024{"}"}</span>
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <BadgeCheckIcon className="size-2.5" /> Verified
        </Badge>
      </div>
    ),
  },
  {
    label: "Manuscript",
    icon: FileTextIcon,
    content: (
      <div className="flex flex-col gap-0.5 text-left font-mono text-[10px] text-muted-foreground">
        <p>
          <span className="text-violet-500 dark:text-violet-400">\section</span>
          {"{Related Work}"}
        </p>
        <p className="truncate">…builds on \cite{"{"}yang2024{"}"}.</p>
      </div>
    ),
  },
  {
    label: "Evidence",
    icon: ScaleIcon,
    content: (
      <div className="flex flex-col gap-1 text-left">
        <p className="text-[10px] text-muted-foreground">&ldquo;Early training favors majority samples.&rdquo;</p>
        <Badge variant="outline" className="w-fit text-[10px] text-warning">
          Needs more evidence
        </Badge>
      </div>
    ),
  },
  {
    label: "Review",
    icon: MessageCircleIcon,
    content: (
      <div className="flex flex-col gap-1 text-left">
        <p className="text-[10px] text-foreground">&ldquo;Cite the 2024 benchmark here?&rdquo;</p>
        <p className="text-[10px] text-muted-foreground">4 unresolved</p>
      </div>
    ),
  },
  {
    label: "PDF",
    icon: FileTextIcon,
    content: (
      <div className="mx-auto flex aspect-[8.5/11] w-14 flex-col gap-1 rounded-sm bg-white p-1.5 shadow-sm">
        <div className="h-1 w-3/4 rounded-full bg-neutral-300" />
        <div className="h-0.5 w-full rounded-full bg-neutral-200" />
        <div className="h-0.5 w-full rounded-full bg-neutral-200" />
        <div className="h-0.5 w-2/3 rounded-full bg-neutral-200" />
      </div>
    ),
  },
];

export function ResearchPipelineMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-2xl shadow-black/10 dark:shadow-black/40 sm:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-0 sm:flex-row sm:items-stretch sm:gap-0">
        {STAGES.map((stage, i) => (
          <div key={stage.label} className="flex flex-col items-center sm:flex-1 sm:flex-row">
            <div className="flex w-full flex-col items-center gap-2 rounded-xl px-2 py-3 text-center sm:px-1.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <stage.icon className="size-4" />
              </div>
              <p className="text-[11px] font-semibold text-foreground">{stage.label}</p>
              <div className="flex min-h-14 w-full items-start justify-center rounded-lg border border-border/70 bg-muted/30 p-2">
                {stage.content}
              </div>
            </div>
            {i < STAGES.length - 1 && (
              <>
                <ChevronDownIcon className="my-0.5 size-4 shrink-0 text-muted-foreground/50 sm:hidden" />
                <ChevronRightIcon className="mx-0.5 hidden size-4 shrink-0 text-muted-foreground/50 sm:block" />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
