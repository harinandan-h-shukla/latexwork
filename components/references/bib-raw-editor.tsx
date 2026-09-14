"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createBibEntry, deleteBibEntry, updateBibEntry } from "@/lib/mock-api/references";
import { formatBibEntries, parseBibEntries } from "@/lib/bibtex";
import type { BibEntry } from "@/lib/types";

interface BibRawEditorProps {
  fileId: string;
  entries: BibEntry[];
  onApplied: () => void;
}

export function BibRawEditor({ fileId, entries, onApplied }: BibRawEditorProps) {
  const [localText, setLocalText] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const generatedText = formatBibEntries(entries);
  const text = localText ?? generatedText;
  const dirty = localText !== null;

  function handleReset() {
    setLocalText(null);
  }

  async function handleApply() {
    const parsed = parseBibEntries(text);
    setApplying(true);
    try {
      const maxLen = Math.max(parsed.length, entries.length);
      for (let i = 0; i < maxLen; i++) {
        const p = parsed[i];
        const orig = entries[i];
        if (p && orig) {
          await updateBibEntry(orig.id, { key: p.key, type: p.type, fields: p.fields });
        } else if (p && !orig) {
          await createBibEntry(fileId, { key: p.key, type: p.type, fields: p.fields });
        } else if (!p && orig) {
          await deleteBibEntry(orig.id);
        }
      }
      toast.success("Raw BibTeX source applied");
      setLocalText(null);
      onApplied();
    } catch {
      toast.error("Could not parse this BibTeX source");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        This is the raw BibTeX equivalent of the structured entries. Edit it directly and apply
        to re-parse it back into structured entries — a lightweight, reasonably faithful
        round-trip (not a full BibTeX parser).
      </p>
      <Textarea
        value={text}
        onChange={(e) => setLocalText(e.target.value)}
        className="min-h-[380px] font-mono text-xs leading-relaxed"
        spellCheck={false}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={handleReset} disabled={!dirty || applying}>
          Reset
        </Button>
        <Button type="button" onClick={handleApply} disabled={applying}>
          {applying ? "Applying…" : "Apply changes"}
        </Button>
      </div>
    </div>
  );
}
