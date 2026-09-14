"use client";

import { useEffect, useState } from "react";
import { LaptopIcon, CloudIcon, RepeatIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/mock-api/auth";
import { updateEditorDefaults } from "@/lib/mock-api/account";
import { useWorkspaceStore } from "@/store/workspace-store";
import type { CompilerPreference } from "@/lib/types";

/**
 * One-time (first ever project open) or per-project-open (if the account
 * has explicitly chosen "ask-each-time") prompt for local vs. cloud
 * compiling. "ask-each-time" existed in the schema/type before this — it
 * was accepted but never actually asked anything, silently behaving like
 * "prefer-local" (see resolveCompileSource).
 */
export function CompilerChoiceDialog() {
  const projectId = useWorkspaceStore((s) => s.projectId);
  const sessionChoice = useWorkspaceStore((s) => s.sessionCompilerChoice);
  const setSessionChoice = useWorkspaceStore((s) => s.setSessionCompilerChoice);

  const [mode, setMode] = useState<"none" | "first-choice" | "ask-each-time">("none");
  const [saving, setSaving] = useState<CompilerPreference | "local" | "cloud" | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    getCurrentUser().then((user) => {
      if (cancelled) return;
      const pref = user.editorDefaults.compilerPreference;
      if (pref === undefined) {
        setMode("first-choice");
      } else if (pref === "ask-each-time" && sessionChoice === null) {
        setMode("ask-each-time");
      } else {
        setMode("none");
      }
    });
    return () => {
      cancelled = true;
    };
    // Only re-checks when the project changes (a fresh loadProject resets
    // sessionCompilerChoice to null) or the store's session choice itself
    // changes (closes this dialog once answered) — not on every render.
  }, [projectId, sessionChoice]);

  async function choosePermanent(preference: CompilerPreference) {
    setSaving(preference);
    try {
      await updateEditorDefaults({ compilerPreference: preference });
      if (preference !== "ask-each-time") {
        setSessionChoice(preference === "always-cloud" ? "cloud" : "local");
      }
      setMode("none");
    } finally {
      setSaving(null);
    }
  }

  function chooseForThisProject(choice: "local" | "cloud") {
    setSessionChoice(choice);
    setMode("none");
  }

  return (
    <Dialog open={mode !== "none"} onOpenChange={(open) => !open && setMode("none")}>
      <DialogContent className="sm:max-w-md">
        {mode === "first-choice" ? (
          <>
            <DialogHeader>
              <DialogTitle>How should Inkwell compile your documents?</DialogTitle>
              <DialogDescription>
                You can change this later in Settings. Local compiling needs the local-agent
                service running on this machine (see Settings → Local compiler).
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-2">
              <Button
                variant="outline"
                className="h-auto justify-start gap-3 py-3 text-left"
                disabled={saving !== null}
                onClick={() => choosePermanent("prefer-local")}
              >
                <LaptopIcon className="size-5 shrink-0 text-emerald-500" />
                <span>
                  <span className="block font-medium">Prefer my computer</span>
                  <span className="block text-xs text-muted-foreground">
                    Uses local-agent when available, falls back to the cloud otherwise
                  </span>
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start gap-3 py-3 text-left"
                disabled={saving !== null}
                onClick={() => choosePermanent("always-cloud")}
              >
                <CloudIcon className="size-5 shrink-0 text-sky-500" />
                <span>
                  <span className="block font-medium">Always use the cloud</span>
                  <span className="block text-xs text-muted-foreground">
                    No local setup needed — works from any device
                  </span>
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start gap-3 py-3 text-left"
                disabled={saving !== null}
                onClick={() => choosePermanent("ask-each-time")}
              >
                <RepeatIcon className="size-5 shrink-0 text-fuchsia-500" />
                <span>
                  <span className="block font-medium">Ask me each time I open a project</span>
                  <span className="block text-xs text-muted-foreground">
                    Pick local or cloud fresh every time, per project
                  </span>
                </span>
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Compile this project with…</DialogTitle>
              <DialogDescription>
                Your account is set to ask each time (Settings → Compile options to change that).
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:justify-start">
              <Button variant="outline" className="gap-1.5" onClick={() => chooseForThisProject("local")}>
                <LaptopIcon className="size-4 text-emerald-500" />
                My computer
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => chooseForThisProject("cloud")}>
                <CloudIcon className="size-4 text-sky-500" />
                The cloud
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
