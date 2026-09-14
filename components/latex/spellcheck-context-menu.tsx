"use client";

import { useEffect, useRef } from "react";
import type { SpellcheckContextMenuInfo } from "@/components/latex/spellcheck-extension";

const CORRECTIONS: Record<string, string> = {
  teh: "the",
  recieve: "receive",
  adress: "address",
  seperate: "separate",
  occured: "occurred",
  thier: "their",
  definately: "definitely",
  accross: "across",
  wich: "which",
  occassion: "occasion",
  publically: "publicly",
  arguement: "argument",
};

function suggestionsFor(word: string): string[] {
  const lower = word.toLowerCase();
  const primary = CORRECTIONS[lower] ?? word;
  const fallback = [primary, `${primary[0]?.toUpperCase()}${primary.slice(1)}`, `${primary}s`];
  return Array.from(new Set(fallback)).slice(0, 3);
}

export function SpellcheckContextMenu({
  info,
  onClose,
  onReplace,
  onAddToDictionary,
}: {
  info: SpellcheckContextMenuInfo;
  onClose: () => void;
  onReplace: (replacement: string) => void;
  onAddToDictionary: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const suggestions = suggestionsFor(info.word);

  return (
    <div
      ref={ref}
      style={{ top: info.y, left: info.x }}
      className="fixed z-50 flex w-48 flex-col gap-0.5 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
    >
      <div className="px-2 py-1 text-xs font-medium text-muted-foreground">&ldquo;{info.word}&rdquo;</div>
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          className="rounded-md px-2 py-1 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          onClick={() => {
            onReplace(s);
            onClose();
          }}
        >
          {s}
        </button>
      ))}
      <div className="my-0.5 h-px bg-border" />
      <button
        type="button"
        className="rounded-md px-2 py-1 text-left text-sm hover:bg-accent hover:text-accent-foreground"
        onClick={() => {
          onAddToDictionary();
          onClose();
        }}
      >
        Add &ldquo;{info.word}&rdquo; to dictionary
      </button>
    </div>
  );
}
