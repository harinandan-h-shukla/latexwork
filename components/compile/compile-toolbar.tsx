"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  AlertTriangleIcon,
  CheckIcon,
  Loader2Icon,
  PlayIcon,
  RotateCcwIcon,
  SettingsIcon,
  SquareIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CompileStatus } from "@/lib/types";
import type { CompileOptions } from "@/lib/mock-api/compile";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useUiStore } from "@/store/ui-store";
import { FileMenu } from "@/components/workspace/file-menu";

const AUTO_COMPILE_DEBOUNCE_MS = 500;

// loadProject() resets dirtyFileIds to a brand-new empty Set on every
// project (re)load — including a plain page reload, not just switching
// projects — so comparing by reference (state.dirtyFileIds !== prevState.
// dirtyFileIds below) treats "new empty Set replacing old empty Set" as a
// real dirty-state change and fires an unwanted auto-compile ~500ms after
// every project open, with no actual edit involved. Confirmed live: this
// raced against a real user-triggered compile, and the two cancelled each
// other out via runCompile's cancel-if-already-in-flight check, leaving
// the toolbar stuck showing "Compiling" forever. Comparing contents (size
// + membership) instead of reference fixes it while still catching every
// real addition/removal from setFileContent/saveFileContent.
function dirtySetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}

const STEPS: { key: "queued" | "running" | "done"; label: string }[] = [
  { key: "queued", label: "Queued" },
  { key: "running", label: "Compiling" },
  { key: "done", label: "Done" },
];

function stepIndex(status?: CompileStatus): number {
  if (status === "queued") return 0;
  if (status === "running") return 1;
  if (status === undefined) return -1;
  return 2;
}

function StatusStepper({ status }: { status?: CompileStatus }) {
  if (!status) return null;
  const active = stepIndex(status);
  const failed = status === "timeout" || status === "error" || status === "stopped";

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const reached = i <= active;
        const isCurrent = i === active;
        const isFailedDone = step.key === "done" && failed;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div
              className={cn(
                "flex size-4 items-center justify-center rounded-full border text-[9px] font-medium",
                reached && !isFailedDone && "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500",
                reached && isFailedDone && "border-destructive bg-destructive text-white",
                !reached && "border-muted-foreground/30 text-muted-foreground",
                isCurrent && !isFailedDone && "animate-pulse"
              )}
            >
              {reached && !isCurrent ? <CheckIcon className="size-2.5" /> : i + 1}
            </div>
            <span className={cn("text-[10px]", reached ? "text-foreground" : "text-muted-foreground")}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-3 bg-muted-foreground/30" />}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Deliberately minimal: File menu, Compile/Stop, status. Every compiler
 * knob (compiler choice, TeX Live version, draft mode, auto-compile, shell
 * escape, incremental, custom command) lives in Settings → Compile options
 * now instead of a toolbar popover — this toolbar just runs a compile and
 * reports how long it took, local vs. cloud is resolved automatically by
 * runCompile()/resolveCompileSource() same as before, just not surfaced
 * here as a visible picker.
 */
export function CompileToolbar() {
  const compile = useWorkspaceStore((s) => s.compile);
  const isCompiling = useWorkspaceStore((s) => s.isCompiling);
  const runCompile = useWorkspaceStore((s) => s.runCompile);
  const cancelCompile = useWorkspaceStore((s) => s.cancelCompile);
  const setCitationPickerOpen = useWorkspaceStore((s) => s.setCitationPickerOpen);
  const setActiveSidePanel = useWorkspaceStore((s) => s.setActiveSidePanel);

  const compiler = useUiStore((s) => s.compileCompiler);
  const draftMode = useUiStore((s) => s.compileDraftMode);
  const autoCompile = useUiStore((s) => s.compileAutoCompile);
  const setAutoCompile = useUiStore((s) => s.setCompileAutoCompile);
  const shellEscape = useUiStore((s) => s.compileShellEscape);
  const incremental = useUiStore((s) => s.compileIncremental);
  const customCommand = useUiStore((s) => s.compileCustomCommand);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        setCitationPickerOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [setCitationPickerOpen]);

  const status = compile?.status;

  function buildOptions(overrides?: Partial<CompileOptions>): CompileOptions {
    return {
      compiler,
      draftMode,
      shellEscape,
      incremental,
      customCommand: customCommand.trim() || undefined,
      ...overrides,
    };
  }

  const optionsRef = useRef(buildOptions());
  useEffect(() => {
    optionsRef.current = buildOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compiler, draftMode, shellEscape, incremental, customCommand]);

  const autoCompileRef = useRef(autoCompile);
  useEffect(() => {
    autoCompileRef.current = autoCompile;
  }, [autoCompile]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useWorkspaceStore.subscribe((state, prevState) => {
      if (dirtySetsEqual(state.dirtyFileIds, prevState.dirtyFileIds)) return;
      if (!autoCompileRef.current) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        useWorkspaceStore.getState().runCompile(optionsRef.current);
      }, AUTO_COMPILE_DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  function handleCompile(overrides?: Partial<CompileOptions>) {
    runCompile(buildOptions(overrides));
  }

  function handleStop() {
    cancelCompile();
    toast.info("Compile stopped");
  }

  return (
    <div>
      <div className="glass-surface-subtle flex flex-wrap items-center gap-2 border-b px-3 py-1.5">
        <FileMenu />

        {isCompiling ? (
          <Button size="sm" variant="destructive" onClick={handleStop} className="gap-1.5">
            <SquareIcon className="size-3.5" />
            Stop
          </Button>
        ) : (
          <Button size="sm" variant="cta" onClick={() => handleCompile()} className="gap-1.5">
            <PlayIcon className="size-3.5" />
            Compile
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          title="Compiler & local-agent options"
          nativeButton={false}
          render={<Link href="/settings#local-compiler" />}
        >
          <SettingsIcon className="size-3.5 text-slate-500" />
          Compiler options
        </Button>

        {/* Previously only reachable via a full trip to Settings, with no
            indication there that anything auto-compile-related lived
            there — this is the single most reached-for toggle when a
            recompile-on-every-pause loop is unwanted mid-edit, so it's
            inline where Compile itself is. */}
        <div className="flex items-center gap-1.5 border-l pl-2 text-xs text-muted-foreground">
          <Switch id="toolbar-auto-compile" checked={autoCompile} onCheckedChange={setAutoCompile} className="scale-90" />
          <Label htmlFor="toolbar-auto-compile" className="cursor-pointer select-none">
            Auto-compile
          </Label>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <StatusStepper status={status} />
          {status === "queued" && (
            <Badge variant="secondary" className="gap-1">
              <Loader2Icon className="size-3 animate-spin" />
              Queued{compile?.queuePosition ? ` · position ${compile.queuePosition}` : ""}
            </Badge>
          )}
          {status === "running" && (
            <Badge variant="secondary" className="gap-1">
              <Loader2Icon className="size-3 animate-spin" />
              Compiling{compile?.etaSeconds ? ` · ~${compile.etaSeconds}s` : ""}
            </Badge>
          )}
          {status === "success" && (() => {
            // A PDF existing no longer means the compile was clean — without
            // -halt-on-error, latexmk keeps going past a recoverable error
            // (a missing figure, say) and still produces a PDF. A flat green
            // "Compiled" badge would hide that there's something to look at,
            // so this counts real errors in the log and switches to an
            // amber "check the log" state when there are any, same as
            // Overleaf surfaces an error count even when a preview exists.
            const errorCount = compile?.log.filter((l) => l.severity === "error").length ?? 0;
            if (errorCount > 0) {
              return (
                <Badge
                  className="gap-1 cursor-pointer border-transparent bg-gradient-warning text-white"
                  onClick={() => setActiveSidePanel("log")}
                >
                  <AlertTriangleIcon className="size-3" />
                  Compiled · {errorCount} error{errorCount === 1 ? "" : "s"}
                </Badge>
              );
            }
            return (
              <Badge className="gap-1 border-transparent bg-gradient-build text-white">
                <CheckIcon className="size-3" />
                Compiled{compile?.durationMs != null ? ` · ${compile.durationMs}ms` : ""}
              </Badge>
            );
          })()}
          {status === "error" && <Badge variant="destructive">Error</Badge>}
          {status === "timeout" && <Badge variant="destructive">Timed out</Badge>}
          {status === "stopped" && <Badge variant="outline">Stopped</Badge>}
        </div>
      </div>

      {status === "timeout" && (
        <div className="flex items-center justify-between gap-2 border-b bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <span>
            Compile timed out before finishing. This can happen with very large documents or an infinite loop in a
            package/macro. Try draft mode or splitting the document, then retry.
          </span>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => handleCompile({ simulateTimeout: false })}
          >
            <RotateCcwIcon className="size-3.5" />
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
