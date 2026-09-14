import { CheckIcon, CpuIcon, WifiOffIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function LocalCompileMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/5 dark:shadow-black/30",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <CpuIcon className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">Local compiler</span>
        <Badge variant="secondary" className="ml-auto gap-1.5">
          <span className="size-1.5 rounded-full bg-success" />
          Idle
        </Badge>
      </div>

      <div className="flex flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
          <span className="text-sm text-foreground">pdfLaTeX · TeX Live 2025</span>
          <span className="font-mono text-xs text-text-tertiary">example run</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm text-foreground">
            <CheckIcon className="size-3.5 text-success" />
            Compiled locally
          </span>
          <span className="font-mono text-xs text-success">438 ms</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/70 px-3 py-2.5 text-xs text-muted-foreground">
          <WifiOffIcon className="size-3.5 shrink-0" />
          No cloud queue — the build never left this machine.
        </div>
      </div>
    </div>
  );
}
