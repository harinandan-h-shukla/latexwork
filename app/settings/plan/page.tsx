"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PlanTierCard } from "@/components/settings/plan-tier-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/mock-api/auth";
import { updatePlanTier } from "@/lib/mock-api/account";
import { PLAN_ORDER, PLANS } from "@/lib/plans";
import type { User } from "@/lib/types";

export default function PlanSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pendingTier, setPendingTier] = useState<User["planTier"] | null>(null);

  useEffect(() => {
    let active = true;
    getCurrentUser().then((u) => {
      if (active) setUser(u);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!user) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-80 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const currentRank = PLAN_ORDER.indexOf(user.planTier);

  async function handleSelect(tier: User["planTier"]) {
    setPendingTier(tier);
    try {
      const updated = await updatePlanTier(tier);
      setUser(updated);
      toast.success(`Switched to the ${updated.planTier} plan.`);
    } finally {
      setPendingTier(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        You&apos;re currently on the <span className="font-medium text-foreground">{user.planTier}</span> plan.
        Changes here are simulated — no payment is collected.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => {
          const rank = PLAN_ORDER.indexOf(plan.tier);
          const action = rank === currentRank ? null : rank > currentRank ? "upgrade" : "downgrade";
          return (
            <PlanTierCard
              key={plan.tier}
              plan={plan}
              isCurrent={plan.tier === user.planTier}
              action={action}
              busy={pendingTier === plan.tier}
              onSelect={() => handleSelect(plan.tier)}
            />
          );
        })}
      </div>
    </div>
  );
}
