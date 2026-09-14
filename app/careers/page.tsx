import { MailIcon } from "lucide-react";
import { SiteNavbar } from "@/components/marketing/site-navbar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Button } from "@/components/ui/button";

export default function CareersPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNavbar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-16 sm:px-6">
        <div>
          <h1 className="text-3xl font-semibold">Careers</h1>
          <p className="mt-2 text-muted-foreground">
            We&apos;re not hiring for any open roles right now — this page is here so the link isn&apos;t
            a dead end, not to imply otherwise.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            If that changes, or if you&apos;d like to reach out anyway, email us and we&apos;ll keep it on
            file.
          </p>
          <Button
            size="lg"
            className="w-fit gap-2"
            nativeButton={false}
            render={<a href="mailto:support@inkwell.dev?subject=Careers" />}
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
