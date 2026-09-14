"use client";

import { useEffect, useState } from "react";

import type { User } from "@/lib/types";
import { getCurrentUser } from "@/lib/mock-api/auth";
import { Skeleton } from "@/components/ui/skeleton";

function greetingForHour(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardHeader() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  const firstName = user?.name.split(" ")[0];
  const greeting = greetingForHour(new Date().getHours());

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
        {firstName ? (
          `${greeting}, ${firstName}`
        ) : (
          <Skeleton className="inline-block h-9 w-56 align-middle" />
        )}
      </h1>
      <p className="mt-1.5 text-sm text-text-secondary">Continue your research.</p>
    </div>
  );
}
