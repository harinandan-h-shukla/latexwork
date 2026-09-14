import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Compiler } from "@/lib/types";

interface UiState {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  zenMode: boolean;
  setZenMode: (zen: boolean) => void;
  /** One of the `EditorThemeName` values from components/latex/editor-extensions.ts. */
  editorTheme: string;
  setEditorTheme: (theme: string) => void;

  // Compile preferences — moved out of the everyday toolbar (CompileToolbar)
  // into Settings; the toolbar now just shows Compile + time taken and
  // reads these as defaults rather than exposing them as inline controls.
  compileCompiler: Compiler;
  setCompileCompiler: (c: Compiler) => void;
  compileTexLiveVersion: string;
  setCompileTexLiveVersion: (v: string) => void;
  compileDraftMode: boolean;
  setCompileDraftMode: (v: boolean) => void;
  compileAutoCompile: boolean;
  setCompileAutoCompile: (v: boolean) => void;
  compileShellEscape: boolean;
  setCompileShellEscape: (v: boolean) => void;
  compileIncremental: boolean;
  setCompileIncremental: (v: boolean) => void;
  compileCustomCommand: string;
  setCompileCustomCommand: (v: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      zenMode: false,
      setZenMode: (zen) => set({ zenMode: zen }),
      editorTheme: "match-app",
      setEditorTheme: (theme) => set({ editorTheme: theme }),

      compileCompiler: "pdflatex",
      setCompileCompiler: (c) => set({ compileCompiler: c }),
      compileTexLiveVersion: "2024",
      setCompileTexLiveVersion: (v) => set({ compileTexLiveVersion: v }),
      compileDraftMode: false,
      setCompileDraftMode: (v) => set({ compileDraftMode: v }),
      compileAutoCompile: true,
      setCompileAutoCompile: (v) => set({ compileAutoCompile: v }),
      compileShellEscape: false,
      setCompileShellEscape: (v) => set({ compileShellEscape: v }),
      compileIncremental: false,
      setCompileIncremental: (v) => set({ compileIncremental: v }),
      compileCustomCommand: "",
      setCompileCustomCommand: (v) => set({ compileCustomCommand: v }),
    }),
    { name: "ui-store" },
  ),
);
