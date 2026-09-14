"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2Icon, LinkIcon, UnlinkIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createBibEntry } from "@/lib/mock-api/references";

interface BrokenReferencePanelProps {
  fileId: string;
  undefinedCites: string[];
  unusedEntries: string[];
  onCreated: () => void;
}

export function BrokenReferencePanel({
  fileId,
  undefinedCites,
  unusedEntries,
  onCreated,
}: BrokenReferencePanelProps) {
  const [creatingKey, setCreatingKey] = useState<string | null>(null);

  async function handleCreateStub(key: string) {
    setCreatingKey(key);
    try {
      await createBibEntry(fileId, { key, type: "misc", fields: { title: "", year: "" } });
      toast.success(`Created stub entry for "${key}"`);
      onCreated();
    } catch {
      toast.error("Could not create this entry");
    } finally {
      setCreatingKey(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UnlinkIcon className="size-4 text-destructive" />
          Broken &amp; unused references
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Cited but undefined
          </p>
          {undefinedCites.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2Icon className="size-4 text-emerald-500" />
              Every \cite{"{...}"} key resolves to an entry.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {undefinedCites.map((key) => (
                <li key={key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-mono text-destructive">{key}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={creatingKey === key}
                    onClick={() => handleCreateStub(key)}
                  >
                    Create entry
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Defined but never cited
          </p>
          {unusedEntries.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LinkIcon className="size-4 text-emerald-500" />
              Every entry is cited somewhere in the source.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {unusedEntries.map((key) => (
                <li key={key} className="font-mono">
                  {key}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
