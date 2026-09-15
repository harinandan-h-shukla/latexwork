"use client";

import { ImportPanel } from "./import-panel";
import { GitSyncPanel } from "./git-sync-panel";
import { CloudConnectPanel } from "./cloud-connect-panel";
import { ApiKeysPanel } from "./api-keys-panel";
import { WebhookPanel } from "./webhook-panel";
import { useIsDesktopApp } from "@/lib/runtime/use-is-desktop-app";

export function IntegrationsWorkspace({ projectId }: { projectId: string }) {
  const isDesktop = useIsDesktopApp();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Import content, sync with external tools, and manage programmatic access to this project.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Zip import mutates project files directly — desktop-only, per the
            confirmed Phase 3 scope (the website never edits/writes .tex
            content). The other integration panels (git sync, cloud connect,
            API keys, webhooks) are unaffected by that scope. */}
        {isDesktop && <ImportPanel projectId={projectId} />}
        <GitSyncPanel projectId={projectId} />
        <CloudConnectPanel projectId={projectId} />
        <ApiKeysPanel projectId={projectId} />
        <div className="lg:col-span-2">
          <WebhookPanel projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
