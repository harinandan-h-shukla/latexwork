import { MailIcon, TerminalIcon } from "lucide-react";
import { SiteNavbar } from "@/components/marketing/site-navbar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Button } from "@/components/ui/button";

export default function ContributePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNavbar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-16 sm:px-6">
        <div>
          <h1 className="text-3xl font-semibold">Contribute &amp; maintain</h1>
          <p className="mt-2 text-muted-foreground">
            Inkwell isn&apos;t an open-source project with a public repo yet, so there&apos;s no pull
            request to open here — but there are still real ways to help shape it.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <TerminalIcon className="size-5 text-primary" />
            <h2 className="font-medium">Local compiler agent</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            The local-first compile agent (<code className="rounded bg-muted px-1 py-0.5 text-xs">local-agent/</code>)
            is a small, standalone Node/TypeScript service with its own README — if you run into
            rough edges with local compilation, detailed reports (compiler, OS, error output) are
            the most useful contribution right now.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Beyond that: bug reports, feature requests, and &ldquo;this workflow is missing
            something&rdquo; notes all genuinely shape what gets built next.
          </p>
          <Button
            size="lg"
            className="w-fit gap-2"
            nativeButton={false}
            render={<a href="mailto:support@inkwell.dev?subject=Contributing" />}
          >
            <MailIcon className="size-4" />
            Get in touch
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
