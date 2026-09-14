import { AlertTriangleIcon, ListTreeIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const OUTLINE = [
  { label: "Introduction", depth: 0, active: true },
  { label: "Related Work", depth: 0 },
  { label: "Method", depth: 0 },
  { label: "Data collection", depth: 1 },
  { label: "Model architecture", depth: 1 },
  { label: "Results", depth: 0 },
];

export function LatexEditingMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl shadow-black/5 dark:shadow-black/30",
        className,
      )}
    >
      <div className="grid grid-cols-[100px_minmax(0,1fr)] text-xs">
        <div className="border-r border-border/80 bg-muted/20 p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <ListTreeIcon className="size-3" />
            Outline
          </div>
          <div className="flex flex-col gap-0.5">
            {OUTLINE.map((o) => (
              <div
                key={o.label}
                style={{ paddingLeft: `${o.depth * 10}px` }}
                className={cn(
                  "truncate rounded px-1.5 py-1 text-[11px] text-muted-foreground",
                  o.active && "bg-primary/10 text-foreground",
                )}
              >
                {o.label}
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 p-3 font-mono">
          <div className="flex flex-col leading-6">
            <div className="flex gap-3">
              <span className="w-4 text-right text-muted-foreground/50">24</span>
              <span>
                <span className="text-violet-500 dark:text-violet-400">\begin</span>
                {"{"}figure{"}"}
              </span>
            </div>
            <div className="flex gap-3">
              <span className="w-4 text-right text-muted-foreground/50">25</span>
              <span className="relative">
                <span className="text-violet-500 dark:text-violet-400">\includegra</span>
                <span className="rounded bg-primary/10 px-0.5 text-foreground">phics</span>
                <span className="ml-1 inline-flex -translate-y-px items-center gap-2 rounded-md border border-border bg-popover px-2 py-1 align-middle text-[10px] shadow-sm">
                  <span className="text-foreground">includegraphics</span>
                  <span className="text-muted-foreground">includepdf</span>
                  <span className="text-muted-foreground">includeonly</span>
                </span>
              </span>
            </div>
            <div className="flex gap-3">
              <span className="w-4 text-right text-muted-foreground/50">26</span>
              <span>{"{figures/architecture}"}</span>
            </div>
            <div className="flex gap-3">
              <span className="w-4 text-right text-muted-foreground/50">27</span>
              <span className="relative underline decoration-wavy decoration-destructive/70 underline-offset-4">
                \label{"{fig:arch}"}
              </span>
            </div>
            <div className="flex gap-3">
              <span className="w-4 text-right text-muted-foreground/50">28</span>
              <span>
                <span className="text-violet-500 dark:text-violet-400">\end</span>
                {"{"}figure{"}"}
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-[11px] text-destructive">
            <AlertTriangleIcon className="mt-0.5 size-3 shrink-0" />
            <span>
              <span className="font-medium">Duplicate label</span> — {"fig:arch"} is
              already defined on line 61.
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-[10px]">
              beg → \begin{"{}"}…\end{"{}"}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              eq → equation
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              fig → figure
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
