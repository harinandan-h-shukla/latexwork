"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MATH_SYMBOLS, type MathSymbol } from "@/components/latex/latex-symbols";
import type { CodeEditorHandle } from "@/components/editor/code-editor";

const CATEGORIES: MathSymbol["category"][] = ["Greek", "Operators", "Relations", "Arrows", "Misc"];

export function MathSymbolPalette({
  open,
  onOpenChange,
  editorHandle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editorHandle: CodeEditorHandle | null;
}) {
  const [category, setCategory] = useState<MathSymbol["category"]>("Greek");
  const symbols = useMemo(() => MATH_SYMBOLS.filter((s) => s.category === category), [category]);

  function insert(symbol: MathSymbol) {
    editorHandle?.insertAtCursor(symbol.insert);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Math symbols</DialogTitle>
          <DialogDescription>Click a symbol to insert it at the cursor.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <Button
              key={c}
              size="xs"
              variant={c === category ? "default" : "outline"}
              onClick={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {symbols.map((s) => (
            <Button
              key={s.label}
              variant="outline"
              className="h-10 font-mono text-xs"
              onClick={() => insert(s)}
              title={s.label}
            >
              {s.label.replace(/\\/, "")}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
