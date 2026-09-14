"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUiStore } from "@/store/ui-store";
import type { Compiler } from "@/lib/types";

const COMPILERS: { value: Compiler; label: string }[] = [
  { value: "pdflatex", label: "pdfLaTeX" },
  { value: "xelatex", label: "XeLaTeX" },
  { value: "lualatex", label: "LuaLaTeX" },
  { value: "latexdvips", label: "latex+dvips" },
];

const TEX_LIVE_VERSIONS = ["2024", "2023", "2022"];

/**
 * Compile options moved here from the editor toolbar — the toolbar now just
 * shows Compile + time taken, not a picker for every compile knob. These
 * are applied as defaults the next time a compile runs (see
 * store/workspace-store.ts's runCompile, which reads useUiStore directly).
 */
export function CompileOptionsPanel() {
  const compiler = useUiStore((s) => s.compileCompiler);
  const setCompiler = useUiStore((s) => s.setCompileCompiler);
  const texLiveVersion = useUiStore((s) => s.compileTexLiveVersion);
  const setTexLiveVersion = useUiStore((s) => s.setCompileTexLiveVersion);
  const draftMode = useUiStore((s) => s.compileDraftMode);
  const setDraftMode = useUiStore((s) => s.setCompileDraftMode);
  const autoCompile = useUiStore((s) => s.compileAutoCompile);
  const setAutoCompile = useUiStore((s) => s.setCompileAutoCompile);
  const shellEscape = useUiStore((s) => s.compileShellEscape);
  const setShellEscape = useUiStore((s) => s.setCompileShellEscape);
  const incremental = useUiStore((s) => s.compileIncremental);
  const setIncremental = useUiStore((s) => s.setCompileIncremental);
  const customCommand = useUiStore((s) => s.compileCustomCommand);
  const setCustomCommand = useUiStore((s) => s.setCompileCustomCommand);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compile options</CardTitle>
        <CardDescription>
          Applied to every compile. The editor toolbar just shows Compile and how long it took.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Compiler</Label>
            <Select value={compiler} onValueChange={(v) => setCompiler(v as Compiler)}>
              <SelectTrigger className="w-full">
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
          <div className="space-y-1.5">
            <Label>TeX Live version</Label>
            <Select value={texLiveVersion} onValueChange={(v) => v && setTexLiveVersion(v)}>
              <SelectTrigger className="w-full">
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
          <Label htmlFor="settings-draft" className="font-normal">
            Draft mode by default
          </Label>
          <Switch id="settings-draft" checked={draftMode} onCheckedChange={setDraftMode} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="settings-auto" className="font-normal">
            Auto-compile on save
          </Label>
          <Switch id="settings-auto" checked={autoCompile} onCheckedChange={setAutoCompile} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="settings-shell-escape" className="flex-col items-start gap-0.5 font-normal">
            Shell escape
            <span className="block text-xs font-normal text-muted-foreground">Required for minted, svg, etc. Honored by the local compiler.</span>
          </Label>
          <Switch id="settings-shell-escape" checked={shellEscape} onCheckedChange={setShellEscape} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="settings-incremental" className="flex-col items-start gap-0.5 font-normal">
            Incremental compile
            <span className="block text-xs font-normal text-muted-foreground">Skip the queue on small changes.</span>
          </Label>
          <Switch id="settings-incremental" checked={incremental} onCheckedChange={setIncremental} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="settings-custom-command">Custom compile command</Label>
          <Input
            id="settings-custom-command"
            placeholder="latexmk -pdf -shell-escape %DOC%"
            value={customCommand}
            onChange={(e) => setCustomCommand(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Cloud-only demo — for security, the local agent never accepts an arbitrary command from the browser.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
