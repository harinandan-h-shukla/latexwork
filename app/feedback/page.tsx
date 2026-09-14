import { MailIcon, MessageSquareIcon } from "lucide-react";
import { SiteNavbar } from "@/components/marketing/site-navbar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Button } from "@/components/ui/button";

export default function FeedbackPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNavbar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-16 sm:px-6">
        <div className="flex items-center gap-3">
          <MessageSquareIcon className="size-8 text-primary" />
          <div>
            <h1 className="text-3xl font-semibold">Feedback</h1>
            <p className="mt-1 text-muted-foreground">
              What&apos;s working, what isn&apos;t, and what you wish Inkwell did differently.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Same inbox as support — email us directly and mention &ldquo;Feedback&rdquo; in the
            subject so it&apos;s easy to spot.
          </p>
          <Button
            size="lg"
            className="w-fit gap-2"
            nativeButton={false}
            render={<a href="mailto:support@inkwell.dev?subject=Feedback" />}
          >
            <MailIcon className="size-4" />
            Send feedback
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
