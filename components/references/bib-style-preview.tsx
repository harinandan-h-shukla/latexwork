"use client";

import { useState } from "react";
import { BookOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BIB_STYLES, formatEntryForStyle } from "@/lib/bibtex";
import type { BibEntry } from "@/lib/types";

interface BibStylePreviewProps {
  entries: BibEntry[];
}

export function BibStylePreview({ entries }: BibStylePreviewProps) {
  const [style, setStyle] = useState(BIB_STYLES[0].id);
  const previewEntries = entries.slice(0, 3);

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <BookOpenIcon /> Style preview
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Bibliography style preview</DialogTitle>
          <DialogDescription>
            See how a few entries would render under different bibliography styles. Formatting
            is illustrative — not driven by a real BibTeX style engine.
          </DialogDescription>
        </DialogHeader>

        {previewEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add some entries to preview a style.</p>
        ) : (
          <Tabs value={style} onValueChange={(v) => setStyle(v as typeof style)}>
            <TabsList>
              {BIB_STYLES.map((s) => (
                <TabsTrigger key={s.id} value={s.id}>
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {BIB_STYLES.map((s) => (
              <TabsContent key={s.id} value={s.id} className="mt-3">
                <ol className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
                  {previewEntries.map((entry, i) => (
                    <li key={entry.id} className="leading-relaxed">
                      {formatEntryForStyle(entry, s.id, i + 1)}
                    </li>
                  ))}
                </ol>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
