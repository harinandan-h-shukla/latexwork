"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CodeEditorHandle } from "@/components/editor/code-editor";

const MAX_GRID = 8;

function buildTableLatex(rows: number, cols: number): string {
  const colSpec = "c".repeat(cols).split("").join(" | ");
  const headerRow = Array.from({ length: cols }, (_, i) => `Header ${i + 1}`).join(" & ");
  const bodyRows = Array.from({ length: rows - 1 }, (_, r) =>
    Array.from({ length: cols }, (_, c) => `R${r + 1}C${c + 1}`).join(" & ")
  );
  const lines = [
    "\\begin{table}[htbp]",
    "\t\\centering",
    `\t\\begin{tabular}{${colSpec}}`,
    "\t\t\\hline",
    `\t\t${headerRow} \\\\`,
    "\t\t\\hline",
    ...bodyRows.map((r) => `\t\t${r} \\\\`),
    "\t\t\\hline",
    "\t\\end{tabular}",
    "\t\\caption{Caption}",
    "\t\\label{tab:my-table}",
    "\\end{table}",
    "",
  ];
  return lines.join("\n");
}

export function TableGeneratorDialog({
  open,
  onOpenChange,
  editorHandle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editorHandle: CodeEditorHandle | null;
}) {
  const [hover, setHover] = useState({ rows: 2, cols: 2 });

  function insert(rows: number, cols: number) {
    editorHandle?.insertAtCursor(buildTableLatex(rows, cols));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert table</DialogTitle>
          <DialogDescription>
            {hover.rows} × {hover.cols} table
          </DialogDescription>
        </DialogHeader>
        <div
          className="grid w-fit gap-1"
          style={{ gridTemplateColumns: `repeat(${MAX_GRID}, 1.25rem)` }}
          onMouseLeave={() => setHover({ rows: 2, cols: 2 })}
        >
          {Array.from({ length: MAX_GRID * MAX_GRID }, (_, i) => {
            const r = Math.floor(i / MAX_GRID) + 1;
            const c = (i % MAX_GRID) + 1;
            const active = r <= hover.rows && c <= hover.cols;
            return (
              <button
                key={i}
                type="button"
                className={cn(
                  "size-5 rounded-[3px] border transition-colors",
                  active ? "border-primary bg-primary/60" : "border-border bg-muted"
                )}
                onMouseEnter={() => setHover({ rows: r, cols: c })}
                onClick={() => insert(r, c)}
                aria-label={`${r} by ${c}`}
              />
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
