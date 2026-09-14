"use client";

import { Fragment, useState } from "react";
import { toast } from "sonner";
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BibEntryForm } from "@/components/references/bib-entry-form";
import { BibRawEditor } from "@/components/references/bib-raw-editor";
import { deleteBibEntry } from "@/lib/mock-api/references";
import { BIB_TYPE_LABELS, getVenue } from "@/lib/bibtex";
import type { BibEntry } from "@/lib/types";

interface BibEditorProps {
  fileId: string;
  entries: BibEntry[];
  onChange: () => void;
  prefillKey?: string;
  onPrefillConsumed?: () => void;
}

export function BibEditor({ fileId, entries, onChange, prefillKey, onPrefillConsumed }: BibEditorProps) {
  const [view, setView] = useState<"form" | "raw">("form");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function toggleExpanded(entryId: string) {
    setExpandedId((prev) => (prev === entryId ? null : entryId));
    setCreating(false);
  }

  function startCreate() {
    setCreating(true);
    setExpandedId(null);
  }

  async function handleDelete(entry: BibEntry) {
    try {
      await deleteBibEntry(entry.id);
      toast.success(`Removed "${entry.key}"`);
      if (expandedId === entry.id) setExpandedId(null);
      onChange();
    } catch {
      toast.error("Could not remove this entry");
    }
  }

  const showCreatePrefill = creating || Boolean(prefillKey);

  return (
    <Tabs value={view} onValueChange={(v) => setView(v as "form" | "raw")}>
      <div className="flex items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="form">Form view</TabsTrigger>
          <TabsTrigger value="raw">Raw .bib</TabsTrigger>
        </TabsList>
        {view === "form" && (
          <Button size="sm" variant="outline" onClick={startCreate}>
            <PlusIcon /> Add entry
          </Button>
        )}
      </div>

      <TabsContent value="form" className="mt-4">
        <div className="flex flex-col gap-3">
          {showCreatePrefill && (
            <BibEntryForm
              fileId={fileId}
              initialKey={prefillKey}
              onSaved={() => {
                setCreating(false);
                onPrefillConsumed?.();
                onChange();
              }}
              onCancel={() => {
                setCreating(false);
                onPrefillConsumed?.();
              }}
            />
          )}

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Key</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No bibliography entries yet.
                    </TableCell>
                  </TableRow>
                )}
                {entries.map((entry) => (
                  <Fragment key={entry.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => toggleExpanded(entry.id)}
                    >
                      <TableCell>
                        {expandedId === entry.id ? (
                          <ChevronDownIcon className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRightIcon className="size-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                          {entry.key}
                          {entry.isDuplicateKey && (
                            <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                              duplicate
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{BIB_TYPE_LABELS[entry.type]}</Badge>
                      </TableCell>
                      <TableCell className="max-w-64 truncate">
                        {entry.fields.title || <span className="text-muted-foreground">—</span>}
                        {getVenue(entry.fields) && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({getVenue(entry.fields)})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{entry.fields.year || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(entry);
                          }}
                          title="Delete entry"
                          aria-label="Delete entry"
                        >
                          <Trash2Icon className="text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedId === entry.id && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/20 p-3">
                          <BibEntryForm
                            fileId={fileId}
                            entry={entry}
                            onSaved={() => {
                              onChange();
                            }}
                            onCancel={() => setExpandedId(null)}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="raw" className="mt-4">
        <BibRawEditor fileId={fileId} entries={entries} onApplied={onChange} />
      </TabsContent>
    </Tabs>
  );
}
