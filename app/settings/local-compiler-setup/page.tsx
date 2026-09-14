"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangleIcon, CheckCircle2Icon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Os = "macos" | "windows" | "linux";

const TEX_INSTALL: Record<Os, { name: string; url: string; steps: string[]; commands?: { label: string; command: string }[] }> = {
  macos: {
    name: "MacTeX",
    url: "https://tug.org/mactex/",
    steps: [
      "Download and run the MacTeX installer — it installs a complete TeX Live distribution (pdflatex, xelatex, lualatex, latexmk, bibtex, biber all included).",
      "This is a large download (several GB). For something smaller, install BasicTeX instead and add packages as you need them with tlmgr.",
    ],
  },
  windows: {
    name: "MiKTeX",
    url: "https://miktex.org/download",
    steps: [
      "Download and run the MiKTeX installer.",
      'During setup, when asked about missing packages, choose "Always install missing packages on-the-fly" so you don\'t have to add packages manually later.',
      "MiKTeX includes pdflatex/xelatex/lualatex; latexmk and biber may prompt to install the first time they're used.",
    ],
  },
  linux: {
    name: "TeX Live",
    url: "https://tug.org/texlive/",
    steps: [
      "Install via your distro's package manager (root required), or with TeX Live's own user-space installer (install-tl) if you don't have root — see tug.org/texlive.",
    ],
    commands: [
      { label: "Debian/Ubuntu", command: "sudo apt install texlive-full" },
      { label: "Fedora", command: "sudo dnf install texlive-scheme-full" },
      { label: "Arch", command: "sudo pacman -S texlive-most" },
    ],
  },
};

const AGENT_COMMAND = "cd local-agent && npm install && npm run build && npm start";

function CopyableCommand({ command }: { command: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy — select and copy it manually");
    }
  }
  return (
    <div className="flex items-center gap-1.5">
      <code className="block flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs whitespace-pre">
        {command}
      </code>
      <Button variant="ghost" size="icon-sm" className="shrink-0" onClick={copy} title="Copy">
        <CopyIcon className="size-3.5" />
      </Button>
    </div>
  );
}

const LOCALHOST_ORIGINS = new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);

export default function LocalCompilerSetupPage() {
  const [os, setOs] = useState<Os>("linux");
  // local-agent only accepts connections from a fixed origin allow-list
  // (defaults to localhost:3000 only) — a real, previously-silent bug:
  // testing from a deployed domain (not localhost) gets rejected by
  // local-agent's CORS check with no visible error anywhere in this app,
  // just "local compiler not detected." Detecting the current origin here
  // lets the guide hand over the exact env var value needed instead of a
  // placeholder the user has to figure out is even necessary.
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const needsOriginConfig = currentOrigin !== "" && !LOCALHOST_ORIGINS.has(currentOrigin);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-10 sm:px-6">
      <div>
        <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to settings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Set up local compilation</h1>
        <p className="mt-1 text-muted-foreground">
          Compile LaTeX directly on this computer instead of the cloud queue — faster previews, and it keeps
          working offline. This requires two things installed on your own machine: a TeX distribution, and this
          project&apos;s local-agent service.
        </p>
      </div>

      {needsOriginConfig && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader>
            {/* Color alone (text-warning on a light tint) sits right at
                ~3.2:1 contrast in light mode — under WCAG's 4.5:1 for body
                text. Keeping the heading in the normal foreground color and
                using warning color only on the icon avoids that, matching
                the pattern the timeout banner below already uses
                (text-destructive stays reserved for where the background
                is solid/high-contrast, not a 5-10% tint). */}
            <CardTitle className="flex items-center gap-1.5">
              <AlertTriangleIcon className="size-4 text-warning" />
              You&apos;re using a deployed site, not localhost
            </CardTitle>
            <CardDescription>
              local-agent only accepts connections from an allow-listed origin (localhost only, by default) — from{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{currentOrigin}</code>, it will silently
              refuse the connection unless you tell it to allow this origin. Set this environment variable before
              starting local-agent in step 2 below:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CopyableCommand command={`INKWELL_AGENT_ALLOWED_ORIGINS=${currentOrigin}`} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>1. Install a TeX distribution</CardTitle>
          <CardDescription>Provides pdflatex/xelatex/lualatex, latexmk, and bibtex/biber.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={os} onValueChange={(v) => v && setOs(v as Os)}>
            <TabsList>
              <TabsTrigger value="linux">Linux</TabsTrigger>
              <TabsTrigger value="macos">macOS</TabsTrigger>
              <TabsTrigger value="windows">Windows</TabsTrigger>
            </TabsList>
            {(Object.keys(TEX_INSTALL) as Os[]).map((key) => (
              <TabsContent key={key} value={key} className="space-y-3">
                <a
                  href={TEX_INSTALL[key].url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  {TEX_INSTALL[key].name}
                  <ExternalLinkIcon className="size-3.5" />
                </a>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  {TEX_INSTALL[key].steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
                {TEX_INSTALL[key].commands && (
                  <div className="space-y-2">
                    {TEX_INSTALL[key].commands!.map((c) => (
                      <div key={c.label} className="space-y-1">
                        <p className="text-xs font-medium text-foreground">{c.label}</p>
                        <CopyableCommand command={c.command} />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Start the local compiler agent</CardTitle>
          <CardDescription>
            A small Node.js service (this project&apos;s own <code className="rounded bg-muted px-1 py-0.5 text-xs">local-agent/</code> folder)
            that this site talks to on localhost — it never runs arbitrary commands, only the fixed set of LaTeX
            compilers it detects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Requires Node.js 18 or newer. In a terminal, from the project root:</p>
          <CopyableCommand
            command={needsOriginConfig ? `INKWELL_AGENT_ALLOWED_ORIGINS=${currentOrigin} ${AGENT_COMMAND}` : AGENT_COMMAND}
          />
          <p className="text-sm text-muted-foreground">
            On startup it prints which compilers it found — and which origins it&apos;s accepting connections
            from, so you can confirm the value above took effect. Leave this running in the background while you
            use Inkwell.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2Icon className="size-5 text-success" />
            3. Verify it worked
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Go back to <Link href="/settings" className="text-primary hover:underline">Settings → Local compiler</Link> and
            click &ldquo;Recheck&rdquo; — once it connects, compiling from the editor will run on this machine
            automatically (you can change this preference there too).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
