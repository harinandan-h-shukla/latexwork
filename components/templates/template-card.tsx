import { BookOpen, FileText, GraduationCap, Mail, Presentation } from "lucide-react";
import type { Template } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<Template["category"], React.ComponentType<{ className?: string }>> = {
  journal: BookOpen,
  thesis: GraduationCap,
  resume: FileText,
  presentation: Presentation,
  letter: Mail,
  other: FileText,
};

const CATEGORY_LABEL: Record<Template["category"], string> = {
  journal: "Journal",
  thesis: "Thesis",
  resume: "Resume",
  presentation: "Presentation",
  letter: "Letter",
  other: "Other",
};

const CATEGORY_TINT: Record<Template["category"], string> = {
  journal: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  thesis: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  resume: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  presentation: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  letter: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  other: "bg-muted text-muted-foreground",
};

interface TemplateCardProps {
  template: Template;
  onClick?: () => void;
  className?: string;
}

export function TemplateCard({ template, onClick, className }: TemplateCardProps) {
  const Icon = CATEGORY_ICON[template.category];

  return (
    <Card
      className={cn(
        "cursor-pointer gap-3 transition-shadow hover:shadow-md",
        className,
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
    >
      <div
        className={cn(
          "mx-4 flex h-28 items-center justify-center rounded-lg",
          CATEGORY_TINT[template.category],
        )}
      >
        <Icon className="size-9" />
      </div>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <span className="truncate">{template.name}</span>
        </CardTitle>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{CATEGORY_LABEL[template.category]}</Badge>
          {template.publisher && <Badge variant="secondary">{template.publisher}</Badge>}
          {template.isOwn && <Badge>Yours</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-2 text-sm text-muted-foreground">{template.description}</p>
      </CardContent>
    </Card>
  );
}
