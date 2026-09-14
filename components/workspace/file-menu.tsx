"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDownIcon, DownloadIcon, FileIcon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useWorkspaceStore } from "@/store/workspace-store";
import { downloadFile } from "@/lib/mock-api/files";
import { exportProject } from "@/lib/mock-api/export";
import { triggerDownload } from "@/lib/download-utils";

function triggerTextDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function FileMenu() {
  const projectId = useWorkspaceStore((s) => s.projectId);
  const activeFileId = useWorkspaceStore((s) => s.activeFileId);
  const files = useWorkspaceStore((s) => s.files);
  const fileContents = useWorkspaceStore((s) => s.fileContents);
  const dirtyFileIds = useWorkspaceStore((s) => s.dirtyFileIds);
  const compile = useWorkspaceStore((s) => s.compile);
  const saveFileContent = useWorkspaceStore((s) => s.saveFileContent);
  const setFileContent = useWorkspaceStore((s) => s.setFileContent);
  const createFileNode = useWorkspaceStore((s) => s.createFileNode);
  const openFile = useWorkspaceStore((s) => s.openFile);

  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingLocalCopy, setSavingLocalCopy] = useState(false);

  const activeFile = files.find((f) => f.id === activeFileId);
  const isDirty = activeFileId ? dirtyFileIds.has(activeFileId) : false;

  async function handleSave() {
    if (!activeFileId) return;
    await saveFileContent(activeFileId);
    toast.success(`Saved ${activeFile?.name ?? "file"}`);
  }

  function openSaveAs() {
    if (!activeFile) return;
    const dot = activeFile.name.lastIndexOf(".");
    const base = dot > 0 ? activeFile.name.slice(0, dot) : activeFile.name;
    const ext = dot > 0 ? activeFile.name.slice(dot) : "";
    setSaveAsName(`${base} copy${ext}`);
    setSaveAsOpen(true);
  }

  async function handleSaveAs() {
    if (!activeFile || !saveAsName.trim()) return;
    setSaving(true);
    try {
      const content = fileContents[activeFile.id] ?? "";
      const newFile = await createFileNode({
        parentId: activeFile.parentId,
        type: "file",
        name: saveAsName.trim(),
      });
      setFileContent(newFile.id, content);
      await saveFileContent(newFile.id);
      await openFile(newFile.id);
      toast.success(`Saved as ${newFile.name}`);
      setSaveAsOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    if (!activeFileId) return;
    const { filename, content } = await downloadFile(activeFileId);
    triggerTextDownload(filename, content);
    toast.success(`Downloading ${filename}`);
  }

  // A local copy independent of any cloud-hosted copy — the "download
  // everything for privacy" action. Two separate downloads (source zip +
  // the actual compiled PDF, not a re-rendered approximation) rather than
  // merging into one file, to reuse the existing, already-correct exporters
  // as-is instead of re-implementing zip assembly around a fetched PDF blob.
  // Note: uploaded images/figures aren't included — this app doesn't
  // actually store binary file bytes anywhere yet (a separate, larger gap;
  // see the project's own notes on object storage), only text source files.
  async function handleDownloadLocalCopy() {
    if (!projectId) return;
    setSavingLocalCopy(true);
    try {
      const { filename, content, encoding } = await exportProject(projectId, "zip");
      triggerDownload(filename, content, "application/zip", encoding);

      if (compile?.pdfUrl) {
        const res = await fetch(compile.pdfUrl);
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "compiled.pdf";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }
      }
      toast.success("Downloading source and PDF");
    } finally {
      setSavingLocalCopy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-1" />}>
          <FileIcon className="size-3.5" />
          File
          <ChevronDownIcon className="size-3 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={handleSave} disabled={!activeFileId || !isDirty}>
            <SaveIcon />
            Save
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openSaveAs} disabled={!activeFileId}>
            <SaveIcon />
            Save as…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDownload} disabled={!activeFileId}>
            <DownloadIcon />
            Download
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void handleDownloadLocalCopy()}
            disabled={!projectId || savingLocalCopy}
          >
            <DownloadIcon />
            Download source + PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveAsOpen} onOpenChange={setSaveAsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={saveAsName}
            onChange={(e) => setSaveAsName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveAs();
            }}
          />
          <DialogFooter>
            <Button onClick={handleSaveAs} disabled={saving || !saveAsName.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
