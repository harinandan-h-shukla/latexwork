"use client";

import { toast } from "sonner";
import { CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Extracted from app/settings/local-compiler-setup/page.tsx, which had it
// as a private inline component — now also used by app/desktop/page.tsx.
export function CopyableCommand({ command }: { command: string }) {
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
