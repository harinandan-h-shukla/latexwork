"use client";

import { useRef, useState } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CodeEditor } from "@/components/editor/code-editor";
import { useWorkspaceStore } from "@/store/workspace-store";

export function SplitPaneEditor({ onClose }: { onClose: () => void }) {
  const files = useWorkspaceStore((s) => s.files);
  const activeFileId = useWorkspaceStore((s) => s.activeFileId);
  const fileContents = useWorkspaceStore((s) => s.fileContents);
  const openFile = useWorkspaceStore((s) => s.openFile);
  const setFileContent = useWorkspaceStore((s) => s.setFileContent);
  const saveFileContent = useWorkspaceStore((s) => s.saveFileContent);

  const textFiles = files.filter((f) => f.type === "file" && !f.isBinary);
  const [secondaryFileId, setSecondaryFileId] = useState<string | null>(
    textFiles.find((f) => f.id !== activeFileId)?.id ?? null
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleSelect(fileId: string | null) {
    if (!fileId) return;
    await openFile(fileId);
    setSecondaryFileId(fileId);
  }

  function handleChange(fileId: string, content: string) {
    setFileContent(fileId, content);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveFileContent(fileId), 600);
  }

  return (
    <div className="flex h-64 shrink-0 flex-col border-b">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-2 py-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Split pane</span>
        <Select value={secondaryFileId ?? undefined} onValueChange={handleSelect}>
          <SelectTrigger size="sm" className="h-6 w-52 text-xs">
            <SelectValue placeholder="Choose a file…" />
          </SelectTrigger>
          <SelectContent>
            {textFiles.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.path}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon-sm" className="ml-auto size-6" onClick={onClose}>
          <XIcon className="size-3.5" />
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        {secondaryFileId ? (
          <CodeEditor
            key={secondaryFileId}
            fileId={secondaryFileId}
            value={fileContents[secondaryFileId] ?? ""}
            onChange={(content) => handleChange(secondaryFileId, content)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a file to open alongside your main editor
          </div>
        )}
      </div>
    </div>
  );
}
