import Link from "next/link";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";

export function PlansSection() {
  return (
    <section id="plans" className="mx-auto w-full max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Start free, upgrade when you need to
        </h2>
        <p className="mt-3 text-pretty text-muted-foreground">
          Every plan gets the full editor. Higher tiers add storage,
          collaborators, and history depth.
        </p>
      </Reveal>

      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan, i) => (
          <Reveal key={plan.tier} delay={i * 70}>
            <div
              className={cn(
                "flex h-full flex-col gap-4 rounded-2xl border p-5",
                plan.tier === "pro" ? "border-primary/40 bg-primary/[0.03]" : "border-border/70",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{plan.name}</span>
                {plan.tier === "pro" && <Badge>Most popular</Badge>}
              </div>
              <div>
                <span className="text-2xl font-semibold text-foreground">{plan.price}</span>
                <span className="ml-1 text-sm text-muted-foreground">{plan.priceNote}</span>
              </div>
              <ul className="flex flex-1 flex-col gap-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.tier === "pro" ? "default" : "outline"}
                className="w-full"
                nativeButton={false}
                render={<Link href="/signup" />}
              >
                Get started
              </Button>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
