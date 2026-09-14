import { PlusIcon, SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const RESULTS = [
  {
    title: "Distribution Alignment for Long-Tailed Regression",
    authors: "H. Shukla et al.",
    venue: "NeurIPS 2026",
  },
  {
    title: "Spectral Structure in Neural Regression",
    authors: "A. Kumar et al.",
    venue: "ICLR 2026",
  },
  {
    title: "Reliable Learning under Label Imbalance",
    authors: "M. Chen et al.",
    venue: "CVPR 2026",
  },
];

export function PaperSearchMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/5 dark:shadow-black/30",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2.5">
        <SearchIcon className="size-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">long-tailed regression</span>
        <Badge variant="outline" className="ml-auto h-5 gap-1 px-1.5 text-[10px] text-text-tertiary">
          Example · demo data
        </Badge>
      </div>

      <div className="flex flex-col gap-1.5 p-2.5">
        {RESULTS.map((r) => (
          <div
            key={r.title}
            className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {r.authors} · {r.venue}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground">
              <PlusIcon className="size-3" />
              Add
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
