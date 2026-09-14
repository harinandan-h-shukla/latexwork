import Link from "next/link";
import { HeartIcon } from "lucide-react";
import { SiteNavbar } from "@/components/marketing/site-navbar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Button } from "@/components/ui/button";

export default function DonatePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNavbar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-16 sm:px-6">
        <div className="flex items-center gap-3">
          <HeartIcon className="size-8 text-primary" />
          <div>
            <h1 className="text-3xl font-semibold">Support Inkwell</h1>
            <p className="mt-1 text-muted-foreground">
              There&apos;s no separate donation button here — we don&apos;t have a payment flow wired
              up for one, and we&apos;d rather not fake it.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            The real way to support ongoing development right now is a paid plan — that revenue
            directly funds the work.
          </p>
          <Button size="lg" className="w-fit gap-2" nativeButton={false} render={<Link href="/#plans" />}>
            View plans
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
