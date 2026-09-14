"use client";

import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import { FileArchiveIcon, Loader2, UploadCloudIcon, XIcon } from "lucide-react";
import { createProject } from "@/lib/mock-api/projects-create";
import { importZipTree, type ZipImportEntry } from "@/lib/mock-api/files";
import { isLikelyBinaryUpload } from "@/components/file-tree/file-tree-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const EXTENSION_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  pdf: "application/pdf",
};

async function readZipEntries(file: File): Promise<ZipImportEntry[]> {
  const zip = await JSZip.loadAsync(file);
  const entries: ZipImportEntry[] = [];

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    // Skip macOS zip metadata cruft that would otherwise show up in the tree.
    if (path.startsWith("__MACOSX/") || path.split("/").pop() === ".DS_Store") continue;

    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const mimeType = EXTENSION_MIME[ext];
    const isBinary = isLikelyBinaryUpload(path, mimeType ?? "");

    if (isBinary) {
      const bytes = await entry.async("uint8array");
      entries.push({ path, content: "", isBinary: true, sizeBytes: bytes.length, mimeType });
    } else {
      const content = await entry.async("string");
      entries.push({ path, content, isBinary: false, sizeBytes: content.length, mimeType });
    }
  }
  return entries;
}

interface NewProjectUploadProps {
  onCreated: (projectId: string) => void;
}

export function NewProjectUpload({ onCreated }: NewProjectUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(picked: File | null) {
    setFile(picked);
    if (picked && !name.trim()) {
      setName(picked.name.replace(/\.zip$/i, ""));
    }
  }

  useEffect(() => {
    if (!uploading) return;
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 20 + 10, 95));
    }, 200);
    return () => clearInterval(interval);
  }, [uploading]);

  async function handleCreate() {
    if (!file || !name.trim()) return;
    setProgress(0);
    setUploading(true);

    // Two genuinely different failure modes were collapsed into one
    // generic "not a valid archive" message before — misleading whenever
    // the zip parsed fine but project creation or the file import itself
    // failed (e.g. a real backend error), which has nothing to do with
    // the archive being invalid.
    let entries: ZipImportEntry[];
    try {
      entries = await readZipEntries(file);
    } catch {
      toast.error("Couldn't read that zip file — is it a valid archive?");
      setUploading(false);
      return;
    }
    if (entries.length === 0) {
      toast.error("That zip file doesn't contain any extractable files.");
      setUploading(false);
      return;
    }

    try {
      const project = await createProject({ name, method: "zip" });
      await importZipTree(project.id, entries);
      setProgress(100);
      onCreated(project.id);
    } catch (err) {
      toast.error(`Couldn't create the project: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Upload a zip archive containing your LaTeX project. Its contents will be imported as-is.
      </p>

      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-input",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) pickFile(dropped);
        }}
      >
        {file ? (
          <>
            <FileArchiveIcon className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                pickFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              disabled={uploading}
            >
              <XIcon /> Remove
            </Button>
          </>
        ) : (
          <>
            <UploadCloudIcon className="size-8 text-muted-foreground" />
            <p className="text-sm">
              Drag & drop a <code className="text-xs">.zip</code> file here, or
            </p>
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              Browse files
            </Button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="upload-project-name">Project name</Label>
        <Input
          id="upload-project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Imported Project"
          disabled={uploading}
        />
      </div>

      {uploading && (
        <div className="flex flex-col gap-1.5">
          <Progress value={progress} />
          <p className="text-xs text-muted-foreground">Uploading… {Math.round(progress)}%</p>
        </div>
      )}

      <div>
        <Button onClick={handleCreate} disabled={!file || !name.trim() || uploading}>
          {uploading ? <Loader2 className="animate-spin" /> : null}
          Upload & create project
        </Button>
      </div>
    </div>
  );
}
