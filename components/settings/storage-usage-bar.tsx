import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 100 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

interface StorageUsageBarProps {
  usedBytes: number;
  quotaBytes: number;
  className?: string;
}

export function StorageUsageBar({ usedBytes, quotaBytes, className }: StorageUsageBarProps) {
  const percentUsed = quotaBytes > 0 ? Math.min(100, (usedBytes / quotaBytes) * 100) : 0;
  const nearLimit = percentUsed >= 90;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">
          {formatBytes(usedBytes)} <span className="text-muted-foreground">of {formatBytes(quotaBytes)} used</span>
        </span>
        <span className={cn("text-muted-foreground", nearLimit && "text-destructive")}>
          {percentUsed.toFixed(1)}%
        </span>
      </div>
      <Progress
        value={percentUsed}
        className={cn(nearLimit && "[&_[data-slot=progress-indicator]]:bg-destructive")}
      />
    </div>
  );
}
