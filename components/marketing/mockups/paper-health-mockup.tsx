import { AlertTriangleIcon, CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const CHECKS = [
  { label: "42 citations resolved", ok: true },
  { label: "38 references used", ok: true },
  { label: "Bibliography compiled", ok: true },
  { label: "No broken references", ok: true },
  { label: "2 unused references", ok: false },
  { label: "1 citation missing metadata", ok: false },
];

export function PaperHealthMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/5 dark:shadow-black/30",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <span className="text-xs font-medium text-foreground">Paper health</span>
        <Badge variant="outline" className="ml-auto h-5 px-1.5 text-[10px] text-text-tertiary">
          Example
        </Badge>
      </div>

      <div className="flex flex-col gap-1.5 p-2.5">
        {CHECKS.map((c) => (
          <div key={c.label} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <span
              className={cn(
                "inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                c.ok ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
              )}
            >
              {c.ok ? <CheckIcon className="size-3" /> : <AlertTriangleIcon className="size-3" />}
            </span>
            <span className="text-sm text-foreground">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
