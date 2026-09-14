"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionsList } from "@/components/settings/sessions-list";
import { PrivacyPrefsForm } from "@/components/settings/privacy-prefs-form";
import { DataExportCard } from "@/components/settings/data-export-card";
import { ActivityLogPanel } from "@/components/settings/activity-log-panel";
import { getCurrentUser } from "@/lib/mock-api/auth";
import type { User } from "@/lib/types";

export default function SecuritySettingsPage() {
  const [user, setUser] = useState<User | null>(null);

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
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <SessionsList />
      <PrivacyPrefsForm user={user} onUserChange={setUser} />
      <DataExportCard />
      <ActivityLogPanel />
    </div>
  );
}
