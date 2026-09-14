"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangleIcon, CheckCircle2Icon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateBibEntry } from "@/lib/mock-api/references";
import { nextAvailableKey } from "@/lib/bibtex";
import type { BibEntry } from "@/lib/types";

interface DuplicateKeyPanelProps {
  entries: BibEntry[];
  duplicateKeys: string[];
  onChanged: () => void;
}

export function DuplicateKeyPanel({ entries, duplicateKeys, onChanged }: DuplicateKeyPanelProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);

  async function handleRename(entry: BibEntry) {
    setRenamingId(entry.id);
    try {
      const allKeys = entries.map((e) => e.key);
      const newKey = nextAvailableKey(entry.key, allKeys);
      await updateBibEntry(entry.id, { key: newKey });
      toast.success(`Renamed to "${newKey}"`);
      onChanged();
    } catch {
      toast.error("Could not rename this entry");
    } finally {
      setRenamingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangleIcon className="size-4 text-amber-500" />
          Duplicate citation keys
        </CardTitle>
      </CardHeader>
      <CardContent>
        {duplicateKeys.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2Icon className="size-4 text-emerald-500" />
            No duplicate keys found.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {duplicateKeys.map((key) => {
              const dupes = entries.filter((e) => e.key === key);
              return (
                <div key={key} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{key}</span>
                    <Badge variant="destructive">{dupes.length} entries</Badge>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {dupes.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between gap-2 text-sm text-muted-foreground"
                      >
                        <span className="truncate">
                          {entry.fields.title || "Untitled"}{" "}
                          {entry.fields.year ? `(${entry.fields.year})` : ""}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={renamingId === entry.id}
                          onClick={() => handleRename(entry)}
                        >
                          Rename
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
