"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2Icon, CloudIcon, CopyIcon, DownloadIcon, FolderCheckIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateEditorDefaults } from "@/lib/mock-api";
import { detectLocal } from "@/lib/local-compiler/compiler-service";
import type { LocalAgentInfo } from "@/lib/local-compiler/types";

type Step = "prompt" | "installing" | "success" | "not-found";

const INSTALL_STEPS = ["Setting up local agent…", "Configuring compiler discovery…", "Starting service…"];
const AGENT_START_COMMAND = "cd local-agent && npm install && npm run build && npm start";

interface LocalCompilerInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected?: (info: LocalAgentInfo) => void;
}

export function LocalCompilerInstallDialog({
  open,
  onOpenChange,
  onDetected,
}: LocalCompilerInstallDialogProps) {
  const [step, setStep] = useState<Step>("prompt");
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState(INSTALL_STEPS[0]);

  function reset() {
    setStep("prompt");
    setProgress(0);
    setStepLabel(INSTALL_STEPS[0]);
  }

  useEffect(() => {
    if (!open || step !== "not-found") return;
    const interval = setInterval(async () => {
      const info = await detectLocal(true);
      if (info) {
        setStep("success");
        onDetected?.(info);
        toast.success("Local compiler connected");
        setTimeout(() => onOpenChange(false), 1200);
      }
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  async function handleCopyCommand() {
    try {
      await navigator.clipboard.writeText(AGENT_START_COMMAND);
      toast.success("Command copied");
    } catch {
      toast.error("Couldn't copy — select and copy it manually");
    }
  }

  async function handleInstall() {
    setStep("installing");
    for (let i = 0; i < INSTALL_STEPS.length; i++) {
      setStepLabel(INSTALL_STEPS[i]);
      const from = (i / INSTALL_STEPS.length) * 100;
      const to = ((i + 1) / INSTALL_STEPS.length) * 100;
      await animateProgress(from, to, setProgress);
    }

    const info = await detectLocal(true);
    if (info) {
      setStep("success");
      onDetected?.(info);
      toast.success("Local compiler connected");
      setTimeout(() => onOpenChange(false), 1200);
    } else {
      setStep("not-found");
    }
  }

  async function handleRetryCheck() {
    const info = await detectLocal(true);
    if (info) {
      setStep("success");
      onDetected?.(info);
      toast.success("Local compiler connected");
      setTimeout(() => onOpenChange(false), 1200);
    } else {
      toast.info("Still no local agent detected");
    }
  }

  async function handleUseCloud() {
    await updateEditorDefaults({ compilerPreference: "always-cloud" });
    toast.success("Using cloud compilation");
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {step === "prompt" && (
          <>
            <DialogHeader>
              <DialogTitle>Local compilation isn&apos;t installed</DialogTitle>
              <DialogDescription>
                Compile documents directly on your computer for faster previews and to avoid waiting on remote
                compile queues.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="flex items-center gap-2 font-medium text-foreground">
                <ShieldCheckIcon className="size-4 shrink-0" />
                This installs a small local compiler service that lets this site compile LaTeX projects on your
                computer.
              </p>
              <p>It can access:</p>
              <ul className="list-disc space-y-0.5 pl-5">
                <li>LaTeX project files supplied by this application</li>
                <li>LaTeX compiler binaries (pdfLaTeX, XeLaTeX, LuaLaTeX, latexmk, BibTeX/Biber)</li>
                <li>Generated PDF, log, and build output files</li>
              </ul>
              <p>It does not get unrestricted access to your filesystem — only a project-scoped work directory.</p>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button className="w-full gap-1.5" onClick={handleInstall}>
                <DownloadIcon className="size-3.5" />
                Install local compiler
              </Button>
              <Button variant="outline" className="w-full gap-1.5" onClick={handleUseCloud}>
                <CloudIcon className="size-3.5" />
                Use cloud compiler
              </Button>
              <Link
                href="/settings/local-compiler-setup"
                className="text-center text-xs text-muted-foreground hover:text-foreground hover:underline"
                onClick={() => onOpenChange(false)}
              >
                Full setup guide (Windows/macOS/Linux) →
              </Link>
            </DialogFooter>
          </>
        )}

        {step === "installing" && (
          <>
            <DialogHeader>
              <DialogTitle>Setting up local compiler…</DialogTitle>
              <DialogDescription>{stepLabel}</DialogDescription>
            </DialogHeader>
            <Progress value={progress} />
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2Icon className="size-5 text-emerald-500" />
                Local compiler ready
              </DialogTitle>
              <DialogDescription>Compiles will now run locally on this machine.</DialogDescription>
            </DialogHeader>
          </>
        )}

        {step === "not-found" && (
          <>
            <DialogHeader>
              <DialogTitle>Couldn&apos;t detect a local compiler</DialogTitle>
              <DialogDescription>
                A browser can&apos;t install background software on your computer for you — you&apos;ll need to
                start the local agent yourself.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
              <p className="flex items-center gap-2 font-medium text-foreground">
                <FolderCheckIcon className="size-4 shrink-0" />
                Run this in a terminal on this computer:
              </p>
              <div className="flex items-center gap-1.5">
                <code className="block flex-1 truncate rounded-md bg-background px-2 py-1.5 font-mono text-[11px]">
                  {AGENT_START_COMMAND}
                </code>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  onClick={handleCopyCommand}
                  title="Copy command"
                >
                  <CopyIcon className="size-3.5" />
                </Button>
              </div>
              <p className="text-muted-foreground">
                We&apos;ll detect it automatically as soon as it&apos;s running — no need to close this, or click
                &quot;Check again&quot; to force a check now.
              </p>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button className="w-full" onClick={handleRetryCheck}>
                Check again
              </Button>
              <Button variant="outline" className="w-full gap-1.5" onClick={handleUseCloud}>
                <CloudIcon className="size-3.5" />
                Use cloud compiler
              </Button>
              <Link
                href="/settings/local-compiler-setup"
                className="text-center text-xs text-muted-foreground hover:text-foreground hover:underline"
                onClick={() => onOpenChange(false)}
              >
                Need a TeX distribution too? Full setup guide →
              </Link>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function animateProgress(from: number, to: number, setProgress: (v: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const durationMs = 380;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      setProgress(from + (to - from) * t);
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
}
