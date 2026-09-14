"use client";

import { useEffect, useState } from "react";
import { AccountForm } from "@/components/settings/account-form";
import { EditorDefaultsForm } from "@/components/settings/editor-defaults-form";
import { LocalCompilerPanel } from "@/components/settings/local-compiler-panel";
import { CompileOptionsPanel } from "@/components/settings/compile-options-panel";
import { LinkedAccountsList } from "@/components/settings/linked-accounts-list";
import { NotificationPrefsForm } from "@/components/settings/notification-prefs-form";
import { PasswordForm } from "@/components/settings/password-form";
import { TwoFactorPanel } from "@/components/settings/two-factor-panel";
import { OpenSourcePanel } from "@/components/settings/open-source-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/mock-api/auth";
import type { User } from "@/lib/types";

export default function SettingsPage() {
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
      <AccountForm user={user} onUserChange={setUser} />
      <PasswordForm />
      <TwoFactorPanel user={user} onUserChange={setUser} />
      <LinkedAccountsList user={user} onUserChange={setUser} />
      <EditorDefaultsForm user={user} onUserChange={setUser} />
      <LocalCompilerPanel user={user} onUserChange={setUser} />
      <CompileOptionsPanel />
      <NotificationPrefsForm user={user} onUserChange={setUser} />
      <OpenSourcePanel />
    </div>
  );
}
