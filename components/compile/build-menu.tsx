"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CircleIcon,
  CloudIcon,
  DownloadIcon,
  Loader2Icon,
  TimerIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CompileResult, Compiler } from "@/lib/types";
import type { LocalAgentInfo } from "@/lib/local-compiler/types";

const COMPILERS: { value: Compiler; label: string }[] = [
  { value: "pdflatex", label: "pdfLaTeX" },
  { value: "xelatex", label: "XeLaTeX" },
  { value: "lualatex", label: "LuaLaTeX" },
  { value: "latexdvips", label: "latex+dvips" },
];

const TEX_LIVE_VERSIONS = ["2024", "2023", "2022"];

interface BuildMenuProps {
  compile: CompileResult | null;
  isCompiling: boolean;

  compiler: Compiler;
  setCompiler: (c: Compiler) => void;
  texLiveVersion: string;
  setTexLiveVersion: (v: string) => void;
  draftMode: boolean;
  setDraftMode: (v: boolean) => void;
  autoCompile: boolean;
  setAutoCompile: (v: boolean) => void;
  shellEscape: boolean;
  setShellEscape: (v: boolean) => void;
  incremental: boolean;
  setIncremental: (v: boolean) => void;
  customCommand: string;
  setCustomCommand: (v: string) => void;

  agentInfo: LocalAgentInfo | null;
  checkingAgent: boolean;
  preference: "prefer-local" | "always-cloud" | "ask-each-time";
  willUseLocal: boolean;

  onInstallClick: () => void;
  onForceTimeout: () => void;
}

/** Compact "Build ▾" control — everything CompileToolbar used to spread across
 * a full row (compiler picker, local/cloud status, TeX Live version, draft &
 * auto-compile switches, shell-escape/incremental/custom-command "Advanced"
 * settings) now lives in one popover behind a badge that communicates the
 * local-first advantage at a glance ("● Local · 0.61s"). No state or compile
 * logic changed — this only restructures the existing JSX/props. */
export function BuildMenu({
  compile,
  isCompiling,
  compiler,
  setCompiler,
  texLiveVersion,
  setTexLiveVersion,
  draftMode,
  setDraftMode,
  autoCompile,
  setAutoCompile,
  shellEscape,
  setShellEscape,
  incremental,
  setIncremental,
  customCommand,
  setCustomCommand,
  agentInfo,
  checkingAgent,
  preference,
  willUseLocal,
  onInstallClick,
  onForceTimeout,
}: BuildMenuProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const showDuration =
    compile?.status === "success" && compile.durationMs != null && !isCompiling;

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        {checkingAgent ? (
          <Loader2Icon className="size-3 animate-spin text-muted-foreground" />
        ) : compile?.source === "local" || (!compile && willUseLocal) ? (
          <CircleIcon className="size-2.5 fill-emerald-500 text-emerald-500" />
        ) : (
          <CloudIcon className="size-3.5 text-muted-foreground" />
        )}
        {checkingAgent
          ? "Checking…"
          : showDuration
            ? `${compile!.source === "local" ? "Local" : "Cloud"} · ${(compile!.durationMs! / 1000).toFixed(2)}s`
            : willUseLocal
              ? "Local compiler"
              : "Cloud compiler"}
        <ChevronDownIcon className="size-3 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <PopoverHeader>
          <PopoverTitle>Build</PopoverTitle>
          <PopoverDescription>
            {agentInfo
              ? "Local compiler agent detected on this machine."
              : "No local compiler agent detected — using cloud compilation."}
          </PopoverDescription>
        </PopoverHeader>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm">
              <CircleIcon
                className={cn(
                  "size-2.5",
                  willUseLocal ? "fill-emerald-500 text-emerald-500" : "fill-muted-foreground text-muted-foreground"
                )}
              />
              Local compiler
            </span>
            {showDuration && compile!.source === "local" && (
              <span className="font-mono text-xs text-muted-foreground">
                {(compile!.durationMs! / 1000).toFixed(2)}s
              </span>
            )}
          </div>
          {agentInfo && (
            <ul className="space-y-1 pl-4 text-xs">
              {agentInfo.compilers.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-2">
                  <span className="capitalize">{c.name}</span>
                  <span className={cn("font-mono", c.available ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                    {c.available ? (c.version ?? "available") : "not found"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {!agentInfo && preference !== "always-cloud" && (
            <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={onInstallClick}>
              <DownloadIcon className="size-3.5" />
              Install local compiler
            </Button>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CloudIcon className="size-3.5" />
              Cloud fallback
            </span>
            <span className="text-xs text-muted-foreground">
              {preference === "always-cloud" ? "Active" : "Available"}
            </span>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs font-normal text-muted-foreground">Compiler</Label>
            <Select value={compiler} onValueChange={(v) => setCompiler(v as Compiler)}>
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPILERS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-normal text-muted-foreground">TeX Live</Label>
            <Select value={texLiveVersion} onValueChange={(v) => v && setTexLiveVersion(v)}>
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEX_LIVE_VERSIONS.map((v) => (
                  <SelectItem key={v} value={v}>
                    TL {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="build-draft" className="text-sm font-normal">
            Draft mode
          </Label>
          <Switch id="build-draft" checked={draftMode} onCheckedChange={setDraftMode} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="build-auto" className="text-sm font-normal">
            Auto compile
          </Label>
          <Switch id="build-auto" checked={autoCompile} onCheckedChange={setAutoCompile} />
        </div>

        <Separator />

        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground"
        >
          Advanced settings
          {advancedOpen ? <ChevronDownIcon className="size-3.5" /> : <ChevronRightIcon className="size-3.5" />}
        </button>

        {advancedOpen && (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-muted-foreground">
              Shell escape is honored by the local compiler. The custom command field is a
              cloud-only demo — for security, the local agent never accepts an arbitrary
              command from the browser.
            </p>

            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="build-shell-escape" className="flex-col items-start gap-0.5 text-sm font-normal">
                Shell escape
                <span className="block text-xs text-muted-foreground">Required for minted, svg, etc.</span>
              </Label>
              <Switch id="build-shell-escape" checked={shellEscape} onCheckedChange={setShellEscape} />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="build-incremental" className="flex-col items-start gap-0.5 text-sm font-normal">
                Incremental compile
                <span className="block text-xs text-muted-foreground">Skip queue on small changes</span>
              </Label>
              <Switch id="build-incremental" checked={incremental} onCheckedChange={setIncremental} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="build-custom-command" className="text-sm font-normal">
                Custom compile command
              </Label>
              <Input
                id="build-custom-command"
                placeholder="latexmk -pdf -shell-escape %DOC%"
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1.5"
              disabled={isCompiling}
              onClick={onForceTimeout}
            >
              <TimerIcon className="size-3.5" />
              Force timeout (demo)
            </Button>
          </div>
        )}

        {preference === "always-cloud" && (
          <p className="text-xs text-muted-foreground">
            Local compilation is disabled — change this in Settings → Compilation.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
