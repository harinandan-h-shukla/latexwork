import {
  ClockIcon,
  FileTextIcon,
  FolderIcon,
  ImageIcon,
  MessageSquareIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface Node {
  icon: LucideIcon;
  label: string;
  meta: string;
  color: string;
}

const NODES: Node[] = [
  { icon: FolderIcon, label: "Manuscript", meta: "6 files · main.tex", color: "text-sky-500" },
  { icon: FileTextIcon, label: "References", meta: "24 entries · references.bib", color: "text-primary" },
  { icon: ImageIcon, label: "Figures & data", meta: "9 assets", color: "text-violet-500" },
  { icon: MessageSquareIcon, label: "Review", meta: "3 open threads", color: "text-secondary-accent" },
  { icon: ClockIcon, label: "Versions", meta: "18 snapshots", color: "text-amber-500" },
];

export function PaperStructureMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/5 dark:shadow-black/30",
        className,
      )}
    >
      <div className="border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium text-foreground">
        Distribution Alignment for Long-Tailed Regression
      </div>
      <div className="flex flex-col gap-1.5 p-2.5">
        {NODES.map((n) => (
          <div
            key={n.label}
            className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 transition-colors hover:border-border-strong"
          >
            <n.icon className={cn("size-4 shrink-0", n.color)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{n.label}</p>
              <p className="text-xs text-text-tertiary">{n.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
