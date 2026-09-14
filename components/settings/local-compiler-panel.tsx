"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2Icon, DownloadIcon, RefreshCwIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { updateEditorDefaults } from "@/lib/mock-api/account";
import { detectLocal } from "@/lib/local-compiler/compiler-service";
import type { LocalAgentInfo } from "@/lib/local-compiler/types";
import type { CompilerPreference, User } from "@/lib/types";
import { LocalCompilerInstallDialog } from "@/components/compile/local-compiler-install-dialog";

const OPTIONS: { value: CompilerPreference; label: string; description: string }[] = [
  {
    value: "prefer-local",
    label: "Prefer local compiler",
    description: "Use the local agent whenever it's available; otherwise compile right in this browser.",
  },
  {
    value: "always-cloud",
    label: "Always use cloud compiler",
    description: "Never use a local agent, even if one is detected.",
  },
  {
    value: "ask-each-time",
    label: "Ask each time",
    description: "Prompt before switching to local compilation.",
  },
];

interface LocalCompilerPanelProps {
  user: User;
  onUserChange: (user: User) => void;
}

export function LocalCompilerPanel({ user, onUserChange }: LocalCompilerPanelProps) {
  const [preference, setPreference] = useState<CompilerPreference>(
    user.editorDefaults.compilerPreference ?? "prefer-local"
  );
  const [saving, setSaving] = useState(false);
  const [agentInfo, setAgentInfo] = useState<LocalAgentInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);

  async function refresh() {
    setChecking(true);
    const info = await detectLocal(true);
    setAgentInfo(info);
    setChecking(false);
  }

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateEditorDefaults({ compilerPreference: preference });
      onUserChange({ ...user, editorDefaults: updated });
      toast.success("Compilation preference saved.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable() {
    setPreference("always-cloud");
    setSaving(true);
    try {
      const updated = await updateEditorDefaults({ compilerPreference: "always-cloud" });
      onUserChange({ ...user, editorDefaults: updated });
      toast.success("Local compilation disabled.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card id="local-compiler">
      <CardHeader>
        <CardTitle>Local compiler</CardTitle>
        <CardDescription>
          Compile LaTeX on this computer via a small local agent, instead of the cloud compile queue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Status</span>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={refresh} disabled={checking}>
              <RefreshCwIcon className={checking ? "size-3.5 animate-spin" : "size-3.5"} />
              Recheck
            </Button>
          </div>
          {checking ? (
            <p className="text-sm text-muted-foreground">Checking for a local agent…</p>
          ) : agentInfo ? (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2Icon className="size-4" />
                Connected · agent v{agentInfo.agentVersion} ({agentInfo.platform})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {agentInfo.compilers.map((c) => (
                  <Badge key={c.name} variant={c.available ? "secondary" : "outline"} className="capitalize">
                    {c.name}
                    {c.available ? "" : " (missing)"}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <XCircleIcon className="size-4" />
                Not connected — falls back to compiling in this browser.
              </p>
              <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={() => setInstallDialogOpen(true)}>
                <DownloadIcon className="size-3.5" />
                Install local compiler
              </Button>
            </div>
          )}
        </div>

        <RadioGroup value={preference} onValueChange={(v) => v && setPreference(v as CompilerPreference)}>
          {OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5 text-sm has-[[data-checked]]:border-primary"
            >
              <RadioGroupItem value={opt.value} className="mt-0.5" />
              <span>
                <span className="block font-medium">{opt.label}</span>
                <span className="block text-xs text-muted-foreground">{opt.description}</span>
              </span>
            </label>
          ))}
        </RadioGroup>

        {agentInfo && preference !== "always-cloud" && (
          <Button variant="outline" size="sm" onClick={handleDisable} disabled={saving}>
            Disable local compilation
          </Button>
        )}
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save compilation preference"}
        </Button>
      </CardFooter>
      <LocalCompilerInstallDialog
        open={installDialogOpen}
        onOpenChange={setInstallDialogOpen}
        onDetected={(info) => setAgentInfo(info)}
      />
    </Card>
  );
}
