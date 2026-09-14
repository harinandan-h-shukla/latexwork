"use client";

import {
  HashIcon,
  EyeIcon,
  Columns2Icon,
  KeyboardIcon,
  CornerDownRightIcon,
  PencilLineIcon,
  SigmaIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace-store";
import type { KeybindingMode } from "@/components/latex/editor-extensions";
import { SpellcheckDictionaryPopover } from "@/components/latex/spellcheck-dictionary-popover";
import type { EditorToolsState } from "@/components/editor/use-editor-tools-state";

const KEYBINDING_LABELS: Record<KeybindingMode, string> = {
  default: "Default",
  vim: "Vim",
  emacs: "Emacs",
};

/** Far-left, always-visible icon column for the editor's less-frequent tools
 * (line numbers, whitespace, split pane, keybinding mode, go-to-line, rename
 * symbol, math symbols, spellcheck dictionary, autocomplete/lint) — mirrors
 * the utility rail on the right edge of the editor column. Nothing here is
 * hidden behind a "More" dropdown; each icon is one click, same as Word/
 * Office tucking rare options into small launchers rather than a menu. */
export function EditorToolsRail({ tools }: { tools: EditorToolsState }) {
  const editorHandle = useWorkspaceStore((s) => s.editorHandle);
  const {
    lineNumbersVisible,
    setLineNumbersVisible,
    showWhitespace,
    setShowWhitespace,
    splitPaneOpen,
    setSplitPaneOpen,
    keybindingMode,
    setKeybindingMode,
    lintEnabled,
    setLintEnabled,
    spellcheckEnabled,
    setSpellcheckEnabled,
    dictionary,
    setDictionary,
    setGoToLineOpen,
    setRenameOpen,
    setSymbolPaletteOpen,
  } = tools;

  // Colored consistently with the right-hand SidePanelRail's always-visible
  // (not just active-state) icon color, per explicit design feedback that a
  // flat/monochrome rail next to a colorful one reads as unfinished. These
  // aren't parallel content domains the way Research/References/etc. are,
  // so the colors here are just a differentiating accent per tool rather
  // than a meaningful category code — active/toggled-on state is still
  // shown the same way as before (bg-accent), layered under the color.
  function railButtonClass(active: boolean) {
    return cn(
      "flex size-8 items-center justify-center rounded-md hover:bg-accent",
      active && "bg-accent"
    );
  }

  return (
    <div className="glass-surface-subtle hidden w-10 shrink-0 flex-col items-center gap-1 border-r py-2 lg:flex">
      <button
        title="Line numbers"
        onClick={() => setLineNumbersVisible((v) => !v)}
        className={railButtonClass(lineNumbersVisible)}
      >
        <HashIcon className="size-4 text-sky-500" />
      </button>
      <button
        title="Show whitespace"
        onClick={() => setShowWhitespace((v) => !v)}
        className={railButtonClass(showWhitespace)}
      >
        <EyeIcon className="size-4 text-cyan-500" />
      </button>
      <button
        title="Split pane"
        onClick={() => setSplitPaneOpen((v) => !v)}
        className={railButtonClass(splitPaneOpen)}
      >
        <Columns2Icon className="size-4 text-indigo-500" />
      </button>

      <div className="my-1 h-px w-6 bg-border" />

      <Popover>
        <PopoverTrigger render={<button title={`Keybindings: ${KEYBINDING_LABELS[keybindingMode]}`} className={railButtonClass(keybindingMode !== "default")} />}>
          <KeyboardIcon className="size-4 text-fuchsia-500" />
        </PopoverTrigger>
        <PopoverContent side="right" className="w-40 p-1" align="start">
          {(Object.keys(KEYBINDING_LABELS) as KeybindingMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setKeybindingMode(mode)}
              className={cn(
                "w-full rounded px-2 py-1 text-left text-sm hover:bg-accent",
                keybindingMode === mode && "bg-accent"
              )}
            >
              {KEYBINDING_LABELS[mode]}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <button title="Go to line (Ctrl/Cmd+G)" onClick={() => setGoToLineOpen(true)} className={railButtonClass(false)}>
        <CornerDownRightIcon className="size-4 text-emerald-500" />
      </button>
      <button title="Rename symbol / label" onClick={() => setRenameOpen(true)} className={railButtonClass(false)}>
        <PencilLineIcon className="size-4 text-rose-500" />
      </button>
      <button
        title="Math symbols"
        disabled={!editorHandle}
        onClick={() => setSymbolPaletteOpen(true)}
        className={cn(railButtonClass(false), "disabled:opacity-40")}
      >
        <SigmaIcon className="size-4 text-amber-500" />
      </button>

      <div className="my-1 h-px w-6 bg-border" />

      <SpellcheckDictionaryPopover
        enabled={spellcheckEnabled}
        onEnabledChange={setSpellcheckEnabled}
        dictionary={dictionary}
        onAdd={(word) => setDictionary((prev) => Array.from(new Set([...prev, word.toLowerCase()])))}
        onRemove={(word) => setDictionary((prev) => prev.filter((w) => w !== word))}
      />

      <button
        title="Lint"
        onClick={() => setLintEnabled((v) => !v)}
        className={railButtonClass(lintEnabled)}
      >
        <span className="text-[10px] font-semibold text-teal-500">Lint</span>
      </button>
    </div>
  );
}
