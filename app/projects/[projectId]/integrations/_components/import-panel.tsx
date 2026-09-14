"use client";

import { useRef, useState } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import { FolderGit2Icon, LinkIcon, UploadCloudIcon, WandSparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { importProject, type ImportSource } from "@/lib/mock-api/export";
import { importZipTree, type ZipImportEntry } from "@/lib/mock-api/files";
import { isLikelyBinaryUpload } from "@/components/file-tree/file-tree-utils";
import { useWorkspaceStore } from "@/store/workspace-store";

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

export function ImportPanel({ projectId }: { projectId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import into this project</CardTitle>
        <CardDescription>
          Bring in files from a zip archive, a GitHub repo, a URL, or an Overleaf export.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="zip">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="zip">
              <UploadCloudIcon /> Zip
            </TabsTrigger>
            <TabsTrigger value="github">
              <FolderGit2Icon /> GitHub
            </TabsTrigger>
            <TabsTrigger value="url">
              <LinkIcon /> URL
            </TabsTrigger>
            <TabsTrigger value="overleaf">
              <WandSparklesIcon /> Overleaf
            </TabsTrigger>
          </TabsList>

          <TabsContent value="zip" className="mt-4">
            <ZipImportForm projectId={projectId} />
          </TabsContent>
          <TabsContent value="github" className="mt-4">
            <ImportForm
              projectId={projectId}
              source="github"
              placeholder="github.com/owner/repo"
              buttonLabel="Clone & import"
            />
          </TabsContent>
          <TabsContent value="url" className="mt-4">
            <ImportForm
              projectId={projectId}
              source="url"
              placeholder="https://example.com/project.zip"
              buttonLabel="Fetch & import"
            />
          </TabsContent>
          <TabsContent value="overleaf" className="mt-4">
            <ImportForm
              projectId={projectId}
              source="overleaf"
              placeholder="Overleaf project URL or exported .zip"
              buttonLabel="Migrate project"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/** The only import path that's actually real — extracts and adds real files to this project. */
function ZipImportForm({ projectId }: { projectId: string }) {
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadProject = useWorkspaceStore((s) => s.loadProject);

  async function handleImport() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a .zip file first");
      return;
    }
    setImporting(true);
    try {
      const entries = await readZipEntries(file);
      if (entries.length === 0) {
        toast.error("That zip file doesn't contain any extractable files.");
        return;
      }
      await importZipTree(projectId, entries);
      // Refresh the workspace store's file list if this project is already loaded.
      if (useWorkspaceStore.getState().projectId === projectId) {
        await loadProject(projectId);
      }
      toast.success(`Imported ${entries.length} file${entries.length === 1 ? "" : "s"}`);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      toast.error("Couldn't read that zip file — is it a valid archive?");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input ref={inputRef} type="file" accept=".zip" className="flex-1" />
      <Button onClick={handleImport} disabled={importing} className="shrink-0">
        {importing ? "Importing…" : "Upload & import"}
      </Button>
    </div>
  );
}

function ImportForm({
  projectId,
  source,
  placeholder,
  buttonLabel,
}: {
  projectId: string;
  source: Exclude<ImportSource, "zip">;
  placeholder: string;
  buttonLabel: string;
}) {
  const [value, setValue] = useState("");
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    if (!value.trim()) {
      toast.error("Provide a source before importing");
      return;
    }
    setImporting(true);
    try {
      const { importedFileCount } = await importProject(projectId, source, value.trim());
      toast.success(`Imported ${importedFileCount} file${importedFileCount === 1 ? "" : "s"} from ${value.trim()}`);
      setValue("");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      <Button onClick={handleImport} disabled={importing} className="shrink-0">
        {importing ? "Importing…" : buttonLabel}
      </Button>
    </div>
  );
}
