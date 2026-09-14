import { Reveal } from "@/components/marketing/reveal";
import { CollaborationMockup } from "@/components/marketing/mockups/collaboration-mockup";

export function CollaborationSection() {
  return (
    <section id="collaboration" className="mx-auto w-full max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Your research team, in one workspace.
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Researchers can write, review, discuss, and organize work
            without constantly switching between an editor, a chat app, and
            a document tracker. Presence, comments, and tracked changes sit
            next to the text they refer to — not in a separate tab.
          </p>
          <ul className="mt-6 flex flex-col gap-3 text-sm">
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="text-foreground">
                Live cursors and presence — see who is editing which file, as
                it happens.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="text-foreground">
                Threaded comments with resolve/reopen, anchored to the
                selection they discuss.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="text-foreground">
                Track changes with per-user filtering and bulk accept/reject.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="text-foreground">
                Role-based sharing — owner, editor, reviewer, or viewer.
              </span>
            </li>
          </ul>
        </Reveal>

        <Reveal delay={100}>
          <CollaborationMockup className="w-full" />
        </Reveal>
      </div>
    </section>
  );
}
