"use client";

import { useState } from "react";
import { useWorkspaceStore } from "@/store/workspace-store";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CreateEntryDialog({
  open,
  onOpenChange,
  type,
  parentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "file" | "folder";
  parentId: string | null;
}) {
  const [name, setName] = useState("");
  const createFileNode = useWorkspaceStore((s) => s.createFileNode);
  const openFile = useWorkspaceStore((s) => s.openFile);

  async function handleCreate() {
    if (!name.trim()) return;
    const file = await createFileNode({ parentId, type, name: name.trim() });
    toast.success(`${type === "file" ? "File" : "Folder"} created`);
    if (type === "file") await openFile(file.id);
    setName("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New {type === "file" ? "file" : "folder"}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder={type === "file" ? "chapter5.tex" : "chapters"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <DialogFooter>
          <Button onClick={handleCreate}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
