"use client";

import { ImportPanel } from "./import-panel";
import { GitSyncPanel } from "./git-sync-panel";
import { CloudConnectPanel } from "./cloud-connect-panel";
import { ApiKeysPanel } from "./api-keys-panel";
import { WebhookPanel } from "./webhook-panel";

export function IntegrationsWorkspace({ projectId }: { projectId: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Import content, sync with external tools, and manage programmatic access to this project.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ImportPanel projectId={projectId} />
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
