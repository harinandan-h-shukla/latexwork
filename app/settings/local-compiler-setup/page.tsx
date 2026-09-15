"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangleIcon, CheckCircle2Icon, ExternalLinkIcon, ZapIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyableCommand } from "@/components/settings/copyable-command";

type Os = "macos" | "windows" | "linux";

interface InstallOption {
  name: string;
  url: string;
  sizeNote: string;
  steps: string[];
  commands?: { label: string; command: string }[];
}

// TinyTeX commands/sizes verified directly against the real installer
// script's own homepage (yihui.org/tinytex — its rendered HTML, not
// secondhand) and the tinytex-releases repo's README (rstudio/tinytex-
// releases), not from memory. TinyTeX-1 (its default bundle) is what
// these installers pull.
const TEX_INSTALL: Record<Os, { fast: InstallOption; full: InstallOption }> = {
  macos: {
    fast: {
      name: "TinyTeX",
      url: "https://yihui.org/tinytex/",
      sizeNote: "~67MB download",
      steps: [
        "Installs pdflatex/xelatex/lualatex, latexmk, and tlmgr (TeX Live's package manager), with the ~100 most commonly used packages preinstalled.",
        "If a compile ever needs a package this doesn't have, install it with a single command (see below) instead of hitting a wall.",
      ],
      commands: [
        { label: "Terminal", command: 'curl -sL "https://tinytex.yihui.org/install-bin-unix.sh" | sh' },
      ],
    },
    full: {
      name: "MacTeX",
      url: "https://tug.org/mactex/",
      sizeNote: "several GB download",
      steps: [
        "Download and run the MacTeX installer — every CTAN package included upfront, nothing ever installs on-demand.",
        "BasicTeX (also from tug.org/mactex) is a smaller full-distribution alternative if you want something between TinyTeX and the complete MacTeX.",
      ],
    },
  },
  windows: {
    fast: {
      name: "TinyTeX",
      url: "https://yihui.org/tinytex/",
      sizeNote: "~74MB download",
      steps: [
        "Same TinyTeX as macOS/Linux, packaged as a Windows batch installer that needs PowerShell (present by default on any current Windows).",
        "Download install-bin-windows.bat from the link below (open it, then Ctrl+S to save), then double-click it to run.",
      ],
      commands: [
        { label: "Chocolatey (if you have it)", command: "choco install tinytex" },
      ],
    },
    full: {
      name: "MiKTeX",
      url: "https://miktex.org/download",
      sizeNote: "smaller upfront, grows as needed",
      steps: [
        "Download and run the MiKTeX installer.",
        'During setup, when asked about missing packages, choose "Always install missing packages on-the-fly" so you don\'t have to add packages manually later.',
        "MiKTeX includes pdflatex/xelatex/lualatex; latexmk and biber may prompt to install the first time they're used.",
      ],
    },
  },
  linux: {
    fast: {
      name: "TinyTeX",
      url: "https://yihui.org/tinytex/",
      sizeNote: "~54MB download",
      steps: [
        "Installs to your home directory — no root/sudo needed, unlike a distro package.",
        "If a compile ever needs a package this doesn't have, install it with a single command (see below) instead of hitting a wall.",
      ],
      commands: [
        { label: "Terminal", command: 'wget -qO- "https://tinytex.yihui.org/install-bin-unix.sh" | sh' },
      ],
    },
    full: {
      name: "TeX Live (full)",
      url: "https://tug.org/texlive/",
      sizeNote: "several GB download",
      steps: [
        "Every CTAN package included upfront, nothing ever installs on-demand — but a large, slow install via your distro's package manager (root required).",
      ],
      commands: [
        { label: "Debian/Ubuntu", command: "sudo apt install texlive-full" },
        { label: "Fedora", command: "sudo dnf install texlive-scheme-full" },
        { label: "Arch", command: "sudo pacman -S texlive-most" },
      ],
    },
  },
};

const TLMGR_COMMAND = "tlmgr install <package-name>";
const CLONE_COMMAND = "git clone https://github.com/harinandan-h-shukla/latexwork.git && cd latexwork/local-agent";
const BUILD_COMMAND = "npm install && npm run build";
// The env var must sit directly in front of the ONE command that actually
// reads it (npm start, i.e. node dist/cli.js) — a real bug in an earlier
// version of this guide put it in front of `cd` instead: `VAR=x cd dir &&
// npm start` only applies VAR to `cd`, not to anything later in the chain,
// so local-agent would silently start with the default (localhost-only)
// origin allow-list no matter what value was shown here. Confirmed by a
// real run reproducing exactly that.
const START_COMMAND_PLAIN = "npm start";

function InstallOptionCard({ option, recommended }: { option: InstallOption; recommended?: boolean }) {
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <a
          href={option.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          {option.name}
          <ExternalLinkIcon className="size-3.5" />
        </a>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {recommended && <ZapIcon className="size-3 text-amber-500" />}
          {option.sizeNote}
        </span>
      </div>
      <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        {option.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ul>
      {option.commands && (
        <div className="space-y-2">
          {option.commands.map((c) => (
            <div key={c.label} className="space-y-1">
              <p className="text-xs font-medium text-foreground">{c.label}</p>
              <CopyableCommand command={c.command} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LocalCompilerSetupPage() {
  const [os, setOs] = useState<Os>("linux");

  const LOCALHOST_ORIGINS = new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);
  // local-agent only accepts connections from a fixed origin allow-list
  // (defaults to localhost:3000 only) — a real, previously-silent bug:
  // testing from a non-default local origin (a different port, or this
  // machine's LAN IP/hostname) gets rejected by local-agent's CORS check
  // with no visible error anywhere in this app, just "local compiler not
  // detected." Detecting the current origin here lets the guide hand over
  // the exact env var value needed instead of a placeholder the user has
  // to figure out is even necessary.
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  // A genuinely public origin (this deployed site, not a local/private
  // one) can NEVER reach local-agent, full stop — confirmed by a real
  // repro, not a guess: the browser's own Private Network Access policy
  // blocks it outright ("Permission was denied for this request to access
  // the loopback address space"), before local-agent's CORS check is even
  // reached. No env var, no header, nothing on either side fixes this —
  // it's a browser security boundary, the same one that stops any public
  // website from probing services on a visitor's own machine or LAN. The
  // origin-allowlist setting below only matters for a *private* local
  // origin (a different port than 3000, or this machine's own LAN
  // hostname/IP) — never for an origin reachable from the public internet.
  const isPublicOrigin =
    typeof window !== "undefined" &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname) &&
    !/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|\[?::1\]?$)/.test(window.location.hostname);
  const needsOriginConfig = currentOrigin !== "" && !LOCALHOST_ORIGINS.has(currentOrigin) && !isPublicOrigin;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-10 sm:px-6">
      <div>
        <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to settings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Set up local compilation</h1>
        <p className="mt-1 text-muted-foreground">
          Used by the{" "}
          <Link href="/desktop" className="underline underline-offset-2 hover:text-foreground">
            Inkwell desktop app
          </Link>{" "}
          to compile LaTeX directly on your own computer instead of the cloud compiler — faster previews, and it
          keeps working offline. This requires two things installed on your own machine: a TeX distribution, and
          this project&apos;s local-agent service.
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
                <InstallOptionCard option={TEX_INSTALL[key].fast} recommended />
                <details className="group">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                    Prefer everything installed upfront instead? Full distribution option
                  </summary>
                  <div className="mt-2">
                    <InstallOptionCard option={TEX_INSTALL[key].full} />
                  </div>
                </details>
                <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
                  <p className="mb-1.5">
                    With TinyTeX, if a compile fails because a package is missing, install just that one:
                  </p>
                  <CopyableCommand command={TLMGR_COMMAND} />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Start the local compiler agent</CardTitle>
          <CardDescription>
            A small Node.js service (the <code className="rounded bg-muted px-1 py-0.5 text-xs">local-agent/</code> folder
            in Inkwell&apos;s own source) that this site talks to on localhost — it never runs arbitrary commands, only
            the fixed set of LaTeX compilers it detects. Requires Node.js 18 or newer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">
              If you don&apos;t already have the Inkwell source on this machine, get it first (only needed once):
            </p>
            <CopyableCommand command={CLONE_COMMAND} />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">
              From inside that <code className="rounded bg-muted px-1 py-0.5 text-xs">local-agent</code> folder, install and build (only needed once, or after an update):
            </p>
            <CopyableCommand command={BUILD_COMMAND} />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">Then start it — every time you want local compiling available:</p>
            <CopyableCommand
              command={
                needsOriginConfig
                  ? `INKWELL_AGENT_ALLOWED_ORIGINS=${currentOrigin} ${START_COMMAND_PLAIN}`
                  : START_COMMAND_PLAIN
              }
            />
          </div>

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
