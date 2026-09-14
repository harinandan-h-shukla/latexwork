import { FeatherIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function LatexWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-serif tracking-tight", className)} aria-label="LaTeX">
      L
      <span className="inline-block -ml-[0.28em] -mr-[0.15em] translate-y-[-0.22em] text-[0.78em]">A</span>
      T
      <span className="inline-block -ml-[0.14em] translate-y-[0.18em] text-[0.78em]">E</span>
      X
    </span>
  );
}

interface InkwellLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

const SIZES = {
  sm: { icon: "size-4", text: "text-sm", tagline: "text-[10px]" },
  md: { icon: "size-5", text: "text-base", tagline: "text-[11px]" },
  lg: { icon: "size-7", text: "text-2xl", tagline: "text-sm" },
};

export function InkwellLogo({ size = "md", showTagline = false, className }: InkwellLogoProps) {
  const s = SIZES[size];
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <FeatherIcon className={cn(s.icon, "shrink-0 text-primary")} />
      <span className="flex flex-col leading-none">
        <span className={cn(s.text, "font-heading font-semibold tracking-tight")}>Inkwell</span>
        {showTagline && (
          <span className={cn(s.tagline, "text-muted-foreground")}>
            <LatexWordmark /> editor
          </span>
        )}
      </span>
    </span>
  );
}
