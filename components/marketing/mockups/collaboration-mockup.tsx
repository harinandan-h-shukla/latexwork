import { CheckIcon, MessageSquareIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const PRESENCE = [
  { name: "Aditi Rao", initials: "AR", color: "bg-rose-500", status: "editing §3.2" },
  { name: "Marco Dias", initials: "MD", color: "bg-sky-500", status: "viewing PDF" },
  { name: "Lin Wei", initials: "LW", color: "bg-emerald-500", status: "in Chapter 4" },
];

export function CollaborationMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl shadow-black/5 dark:shadow-black/30",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/80 bg-muted/40 px-4 py-2.5">
        <span className="text-xs font-medium text-foreground">PhD Thesis — Chapter 4</span>
        <div className="flex -space-x-2">
          {PRESENCE.map((p) => (
            <Avatar key={p.name} size="sm" className="ring-2 ring-card">
              <AvatarFallback className={cn("text-[10px] text-white", p.color)}>
                {p.initials}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {PRESENCE.map((p) => (
          <div key={p.name} className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-xs">
            <span className={cn("size-1.5 shrink-0 rounded-full", p.color)} />
            <span className="font-medium text-foreground">{p.name}</span>
            <span className="text-muted-foreground">{p.status}</span>
          </div>
        ))}

        <div className="mt-1 rounded-xl border border-border/80 bg-muted/30 p-3">
          <div className="flex items-start gap-2">
            <Avatar size="sm">
              <AvatarFallback className="bg-sky-500 text-[10px] text-white">MD</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-medium text-foreground">Marco Dias</span>
                <span className="text-muted-foreground">commented on line 84</span>
              </div>
              <p className="mt-1 rounded-lg bg-background px-2.5 py-1.5 text-xs text-foreground/90">
                Should we cite the 2021 benchmark here instead of the older
                one?
              </p>
              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                <button type="button" className="inline-flex items-center gap-1 hover:text-foreground">
                  <MessageSquareIcon className="size-3" /> Reply
                </button>
                <button type="button" className="inline-flex items-center gap-1 hover:text-foreground">
                  <CheckIcon className="size-3" /> Resolve
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/80 px-3 py-2 text-[11px] text-muted-foreground">
          <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
            tracked
          </Badge>
          <span>
            Aditi Rao replaced <span className="text-foreground/70 line-through">baseline</span>{" "}
            with <span className="text-foreground">state-of-the-art</span>
          </span>
        </div>
      </div>
    </div>
  );
}
