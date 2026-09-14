"use client";

import { CheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PlanTierInfo } from "@/lib/plans";

interface PlanTierCardProps {
  plan: PlanTierInfo;
  isCurrent: boolean;
  action: "upgrade" | "downgrade" | null;
  busy: boolean;
  onSelect: () => void;
}

export function PlanTierCard({ plan, isCurrent, action, busy, onSelect }: PlanTierCardProps) {
  return (
    <Card
      className={cn(
        "flex flex-col",
        isCurrent && "ring-2 ring-primary"
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{plan.name}</CardTitle>
          {isCurrent && <Badge>Current plan</Badge>}
        </div>
        <div className="pt-1">
          <span className="text-2xl font-semibold">{plan.price}</span>
          <span className="ml-1 text-sm text-muted-foreground">{plan.priceNote}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="flex flex-col gap-2 text-sm">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {isCurrent ? (
          <Button variant="outline" className="w-full" disabled>
            Current plan
          </Button>
        ) : (
          <Button
            variant={action === "downgrade" ? "outline" : "default"}
            className="w-full"
            disabled={busy}
            onClick={onSelect}
          >
            {busy ? "Updating…" : action === "downgrade" ? "Downgrade" : "Upgrade"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
