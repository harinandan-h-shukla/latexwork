import { MailIcon } from "lucide-react";
import { SiteNavbar } from "@/components/marketing/site-navbar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNavbar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-16 sm:px-6">
        <div>
          <h1 className="text-3xl font-semibold">Contact us</h1>
          <p className="mt-2 text-muted-foreground">
            Questions about Inkwell, a bug report, or something else — we&apos;d like to hear from you.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            We don&apos;t have an in-app contact form wired to a real inbox yet — for now, email us
            directly and we&apos;ll reply from there.
          </p>
          <Button
            size="lg"
            className="w-fit gap-2"
            nativeButton={false}
            render={<a href="mailto:support@inkwell.dev" />}
          >
            <MailIcon className="size-4" />
            support@inkwell.dev
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
