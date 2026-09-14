"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBibEntry, updateBibEntry } from "@/lib/mock-api/references";
import { BIB_TYPES, BIB_TYPE_FIELDS, BIB_TYPE_LABELS } from "@/lib/bibtex";
import type { BibEntry, BibEntryType } from "@/lib/types";

const FIELD_LABELS: Record<string, string> = {
  author: "Author(s)",
  title: "Title",
  journal: "Journal",
  booktitle: "Book title",
  publisher: "Publisher",
  year: "Year",
  volume: "Volume",
  number: "Number",
  pages: "Pages",
  doi: "DOI",
  address: "Address",
  isbn: "ISBN",
  organization: "Organization",
  howpublished: "How published",
  note: "Note",
  url: "URL",
  school: "School",
  institution: "Institution",
};

interface BibEntryFormProps {
  fileId: string;
  entry?: BibEntry;
  initialKey?: string;
  onSaved: (entry: BibEntry) => void;
  onCancel: () => void;
}

export function BibEntryForm({ fileId, entry, initialKey, onSaved, onCancel }: BibEntryFormProps) {
  const [key, setKey] = useState(entry?.key ?? initialKey ?? "");
  const [type, setType] = useState<BibEntryType>(entry?.type ?? "article");
  const [fields, setFields] = useState<Record<string, string>>(entry?.fields ?? {});
  const [saving, setSaving] = useState(false);

  const knownFields = BIB_TYPE_FIELDS[type];
  const extraFields = Object.keys(fields).filter((f) => !knownFields.includes(f));

  function setField(name: string, value: string) {
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) {
      toast.error("Citation key is required");
      return;
    }
    setSaving(true);
    try {
      const cleanedFields = Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v.trim().length > 0)
      );
      let saved: BibEntry;
      if (entry) {
        saved = await updateBibEntry(entry.id, { key: key.trim(), type, fields: cleanedFields });
        toast.success(`Updated "${saved.key}"`);
      } else {
        saved = await createBibEntry(fileId, { key: key.trim(), type, fields: cleanedFields });
        toast.success(`Added "${saved.key}" to references`);
      }
      onSaved(saved);
    } catch {
      toast.error("Could not save this entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bib-key">Citation key</Label>
          <Input
            id="bib-key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="e.g. smith2020"
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bib-type">Entry type</Label>
          <Select value={type} onValueChange={(v) => setType(v as BibEntryType)}>
            <SelectTrigger id="bib-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BIB_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {BIB_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {knownFields.map((field) => (
          <div key={field} className="flex flex-col gap-1.5">
            <Label htmlFor={`bib-field-${field}`}>{FIELD_LABELS[field] ?? field}</Label>
            <Input
              id={`bib-field-${field}`}
              value={fields[field] ?? ""}
              onChange={(e) => setField(field, e.target.value)}
            />
          </div>
        ))}
        {extraFields.map((field) => (
          <div key={field} className="flex flex-col gap-1.5">
            <Label htmlFor={`bib-field-${field}`}>{FIELD_LABELS[field] ?? field}</Label>
            <Input
              id={`bib-field-${field}`}
              value={fields[field] ?? ""}
              onChange={(e) => setField(field, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : entry ? "Save changes" : "Add entry"}
        </Button>
      </div>
    </form>
  );
}
