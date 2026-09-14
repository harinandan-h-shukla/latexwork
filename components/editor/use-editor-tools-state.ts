"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { KeybindingMode } from "@/components/latex/editor-extensions";

/**
 * Shared state for the editor's less-frequent tools (line numbers, whitespace,
 * split pane, keybinding mode, spellcheck dictionary, autocomplete/lint,
 * go-to-line/rename/math-symbol dialogs). Lives in one hook, owned by
 * EditorWorkspace, so both EditorToolbar (which still applies these as
 * CodeMirror extensions / renders the actual dialogs) and EditorToolsRail
 * (the always-visible left-side icon column that triggers them) read and
 * write the same values instead of drifting out of sync.
 */
export interface EditorToolsState {
  lineNumbersVisible: boolean;
  setLineNumbersVisible: Dispatch<SetStateAction<boolean>>;
  showWhitespace: boolean;
  setShowWhitespace: Dispatch<SetStateAction<boolean>>;
  keybindingMode: KeybindingMode;
  setKeybindingMode: Dispatch<SetStateAction<KeybindingMode>>;
  lintEnabled: boolean;
  setLintEnabled: Dispatch<SetStateAction<boolean>>;
  spellcheckEnabled: boolean;
  setSpellcheckEnabled: Dispatch<SetStateAction<boolean>>;
  dictionary: string[];
  setDictionary: Dispatch<SetStateAction<string[]>>;
  goToLineOpen: boolean;
  setGoToLineOpen: Dispatch<SetStateAction<boolean>>;
  renameOpen: boolean;
  setRenameOpen: Dispatch<SetStateAction<boolean>>;
  symbolPaletteOpen: boolean;
  setSymbolPaletteOpen: Dispatch<SetStateAction<boolean>>;
  splitPaneOpen: boolean;
  setSplitPaneOpen: Dispatch<SetStateAction<boolean>>;
}

export function useEditorToolsState(): EditorToolsState {
  const [lineNumbersVisible, setLineNumbersVisible] = useState(true);
  const [showWhitespace, setShowWhitespace] = useState(false);
  const [keybindingMode, setKeybindingMode] = useState<KeybindingMode>("default");
  const [lintEnabled, setLintEnabled] = useState(true);
  const [spellcheckEnabled, setSpellcheckEnabled] = useState(true);
  const [dictionary, setDictionary] = useState<string[]>([]);
  const [goToLineOpen, setGoToLineOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [symbolPaletteOpen, setSymbolPaletteOpen] = useState(false);
  const [splitPaneOpen, setSplitPaneOpen] = useState(false);

  return {
    lineNumbersVisible,
    setLineNumbersVisible,
    showWhitespace,
    setShowWhitespace,
    keybindingMode,
    setKeybindingMode,
    lintEnabled,
    setLintEnabled,
    spellcheckEnabled,
    setSpellcheckEnabled,
    dictionary,
    setDictionary,
    goToLineOpen,
    setGoToLineOpen,
    renameOpen,
    setRenameOpen,
    symbolPaletteOpen,
    setSymbolPaletteOpen,
    splitPaneOpen,
    setSplitPaneOpen,
  };
}
