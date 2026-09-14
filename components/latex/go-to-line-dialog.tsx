"use client";

import { useState, type FormEvent } from "react";
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
import type { CodeEditorHandle } from "@/components/editor/code-editor";

export function GoToLineDialog({
  open,
  onOpenChange,
  editorHandle,
  maxLine,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editorHandle: CodeEditorHandle | null;
  maxLine: number;
}) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const line = Number.parseInt(value, 10);
    if (!Number.isFinite(line) || line < 1) return;
    editorHandle?.scrollToLine(line);
    onOpenChange(false);
    setValue("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <DialogTitle>Go to line</DialogTitle>
            <DialogDescription>
              Enter a line number{maxLine ? ` between 1 and ${maxLine}` : ""}.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            min={1}
            max={maxLine || undefined}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Line number"
          />
          <DialogFooter>
            <Button type="submit">Go</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
