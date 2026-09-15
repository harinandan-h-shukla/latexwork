import { DownloadIcon, ExternalLinkIcon } from "lucide-react";
import { SiteNavbar } from "@/components/marketing/site-navbar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Button } from "@/components/ui/button";
import { CopyableCommand } from "@/components/settings/copyable-command";

const REPO_URL = "https://github.com/harinandan-h-shukla/latexwork";
// Not merged into main yet (open as a PR) — link to the real branch it
// lives on so this page's instructions actually work today, not a 404.
const DESKTOP_BRANCH = "feature/desktop-hybrid";
const CLONE_COMMAND = `git clone --branch ${DESKTOP_BRANCH} ${REPO_URL}.git && cd latexwork/desktop`;

export default function DesktopAppPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNavbar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-16 sm:px-6">
        <div>
          <h1 className="text-3xl font-semibold">Inkwell Desktop</h1>
          <p className="mt-2 text-muted-foreground">
            Editing and compiling only happen in the desktop app — the website is for viewing, downloading, and
            commenting on your projects. This is where you actually work on a paper.
          </p>
        </div>

        <div className="rounded-xl border border-warning/40 bg-warning/5 p-4">
          <p className="text-sm font-medium text-foreground">Early/experimental — no installer yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            There&apos;s no downloadable app for Mac/Windows/Linux to click through yet — it only runs from
            source right now, and only on Linux (Windows/macOS builds haven&apos;t been attempted). If that
            changes, this page will be updated with real download links instead of the instructions below.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-foreground">Run it from source (Linux)</p>
          <p className="text-sm text-muted-foreground">
            You&apos;ll need the system libraries Tauri needs to draw its window, the Rust toolchain, and Node
            (same as the rest of Inkwell) — the full, current list is in the repo&apos;s own{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">desktop/README.md</code>, since that&apos;s
            what actually gets kept up to date as the app changes, not a copy of it here.
          </p>
          <CopyableCommand command={CLONE_COMMAND} />
          <CopyableCommand command="npm install && npm run tauri dev" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            nativeButton={false}
            render={<a href={`${REPO_URL}/blob/${DESKTOP_BRANCH}/desktop/README.md`} target="_blank" rel="noreferrer" />}
            className="gap-1.5"
          >
            <ExternalLinkIcon className="size-4" />
            Full install guide (desktop/README.md)
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={`${REPO_URL}/tree/${DESKTOP_BRANCH}/desktop`} target="_blank" rel="noreferrer" />}
            className="gap-1.5"
          >
            <DownloadIcon className="size-4" />
            View source
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
