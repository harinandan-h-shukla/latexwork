"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getFileContent } from "@/lib/mock-api";
import { useWorkspaceStore } from "@/store/workspace-store";
import { countSymbolOccurrences, renameSymbolInContent } from "@/components/latex/latex-utils";

interface PreviewEntry {
  fileId: string;
  path: string;
  content: string;
  count: number;
}

export function RenameSymbolDialog({
  open,
  onOpenChange,
  initialName = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
}) {
  const files = useWorkspaceStore((s) => s.files);
  const fileContents = useWorkspaceStore((s) => s.fileContents);
  const setFileContent = useWorkspaceStore((s) => s.setFileContent);
  const saveFileContent = useWorkspaceStore((s) => s.saveFileContent);

  const [oldName, setOldName] = useState(initialName);
  const [newName, setNewName] = useState("");
  const [preview, setPreview] = useState<PreviewEntry[] | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function findOccurrences() {
    if (!oldName.trim()) return;
    setIsBusy(true);
    const textFiles = files.filter((f) => f.type === "file" && !f.isBinary);
    const entries: PreviewEntry[] = [];
    const unreadable: string[] = [];
    for (const file of textFiles) {
      let content: string;
      try {
        content = fileContents[file.id] ?? (await getFileContent(file.id));
      } catch {
        // A file whose content can't be decrypted can't be scanned or
        // safely rewritten — skip it (rather than aborting the whole scan)
        // and tell the user, instead of silently omitting it.
        unreadable.push(file.name);
        continue;
      }
      const count = countSymbolOccurrences(content, oldName.trim());
      if (count > 0) entries.push({ fileId: file.id, path: file.path, content, count });
    }
    if (unreadable.length > 0) {
      toast.error(`Couldn't read ${unreadable.length === 1 ? unreadable[0] : `${unreadable.length} files`} — skipped.`);
    }
    setPreview(entries);
    setIsBusy(false);
  }

  async function applyRename() {
    if (!preview || !newName.trim()) return;
    setIsBusy(true);
    let totalCount = 0;
    for (const entry of preview) {
      const { content, count } = renameSymbolInContent(entry.content, oldName.trim(), newName.trim());
      totalCount += count;
      setFileContent(entry.fileId, content);
      await saveFileContent(entry.fileId);
    }
    setIsBusy(false);
    toast.success(`Renamed ${totalCount} occurrence${totalCount === 1 ? "" : "s"} across ${preview.length} file${preview.length === 1 ? "" : "s"}`);
    onOpenChange(false);
    setPreview(null);
    setOldName("");
    setNewName("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setPreview(null);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename symbol / label</DialogTitle>
          <DialogDescription>
            Renames every \label, \ref, \eqref, \cite and environment occurrence across the project.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="rename-old">Current name</Label>
            <Input
              id="rename-old"
              value={oldName}
              onChange={(e) => {
                setOldName(e.target.value);
                setPreview(null);
              }}
              placeholder="e.g. fig:architecture"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="rename-new">New name</Label>
            <Input id="rename-new" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. fig:system-architecture" />
          </div>
        </div>

        {preview && (
          <div className="max-h-40 overflow-auto rounded-md border p-2 text-xs">
            {preview.length === 0 ? (
              <span className="text-muted-foreground">No occurrences found.</span>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {preview.map((entry) => (
                  <li key={entry.fileId} className="flex justify-between">
                    <span>{entry.path}</span>
                    <span className="text-muted-foreground">{entry.count}×</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          {!preview ? (
            <Button onClick={findOccurrences} disabled={isBusy || !oldName.trim()}>
              Find occurrences
            </Button>
          ) : (
            <Button onClick={applyRename} disabled={isBusy || preview.length === 0 || !newName.trim()}>
              Rename {preview.reduce((s, e) => s + e.count, 0)} occurrence(s)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
