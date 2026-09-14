"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BoxIcon, HardDriveIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { connectLinkedAccount, disconnectLinkedAccount } from "@/lib/mock-api/account";
import { GitHubIcon, GoogleIcon, OrcidIcon } from "@/components/shell/oauth-icons";
import type { LinkedAccount, User } from "@/lib/types";

const SETTINGS_PROVIDERS: Array<{
  provider: LinkedAccount["provider"];
  label: string;
  description: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode;
  brandIcon?: boolean;
}> = [
  { provider: "google", label: "Google", description: "Sign in and single sign-on.", icon: GoogleIcon, brandIcon: true },
  { provider: "orcid", label: "ORCID", description: "Link your researcher identity.", icon: OrcidIcon, brandIcon: true },
  { provider: "github", label: "GitHub", description: "Two-way project sync.", icon: GitHubIcon, brandIcon: true },
  { provider: "dropbox", label: "Dropbox", description: "File sync and backups.", icon: BoxIcon },
  { provider: "google-drive", label: "Google Drive", description: "File sync and backups.", icon: HardDriveIcon },
];

interface LinkedAccountsListProps {
  user: User;
  onUserChange: (user: User) => void;
}

export function LinkedAccountsList({ user, onUserChange }: LinkedAccountsListProps) {
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);

  async function handleConnect(provider: LinkedAccount["provider"], label: string) {
    setPendingProvider(provider);
    try {
      const account = await connectLinkedAccount(provider);
      const linkedAccounts = user.linkedAccounts.some((a) => a.provider === provider)
        ? user.linkedAccounts
        : [...user.linkedAccounts, account];
      onUserChange({ ...user, linkedAccounts });
      toast.success(`Connected ${label}.`);
    } finally {
      setPendingProvider(null);
    }
  }

  async function handleDisconnect(provider: LinkedAccount["provider"], label: string) {
    setPendingProvider(provider);
    try {
      await disconnectLinkedAccount(provider);
      onUserChange({
        ...user,
        linkedAccounts: user.linkedAccounts.filter((a) => a.provider !== provider),
      });
      toast.success(`Disconnected ${label}.`);
    } finally {
      setPendingProvider(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linked accounts</CardTitle>
        <CardDescription>Connect external accounts for sign-in and integrations.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {SETTINGS_PROVIDERS.map(({ provider, label, description, icon: Icon, brandIcon }) => {
          const linked = user.linkedAccounts.find((a) => a.provider === provider);
          const busy = pendingProvider === provider;
          return (
            <div
              key={provider}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 not-last:border-b border-border"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-8 items-center justify-center overflow-hidden rounded-full",
                    brandIcon ? "bg-white ring-1 ring-border" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className={brandIcon ? "size-4.5" : "size-4"} />
                </span>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    {linked ? `Connected · ${linked.externalEmail ?? linked.externalId}` : description}
                  </p>
                </div>
              </div>
              {linked ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleDisconnect(provider, label)}
                >
                  {busy ? "Disconnecting…" : "Disconnect"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleConnect(provider, label)}
                >
                  {busy ? "Connecting…" : "Connect"}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
