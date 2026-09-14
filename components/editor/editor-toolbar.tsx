"use client";

import "katex/dist/katex.min.css";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  MinusIcon,
  PlusIcon,
  WrapTextIcon,
  SearchIcon,
  TypeIcon,
  Undo2Icon,
  Redo2Icon,
  ChevronDownIcon,
  QuoteIcon,
  ImageIcon,
  Table2Icon,
  SigmaIcon,
  Link2Icon,
  ClipboardCheckIcon,
  PanelRightIcon,
  PaletteIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger, PopoverHeader, PopoverTitle } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useUiStore } from "@/store/ui-store";
import { getFileContent } from "@/lib/mock-api";
import { getReferencesFile, listBibEntries } from "@/lib/mock-api/references";
import type { BibEntry } from "@/lib/types";
import { undo as cmUndo, redo as cmRedo } from "@codemirror/commands";

import {
  applyExtensionState,
  buildAutocompleteExtension,
  buildFontSizeExtension,
  buildKeybindingExtension,
  buildLineNumbersExtension,
  buildLintExtension,
  buildThemeExtension,
  buildWhitespaceExtension,
  buildWordWrapExtension,
  EDITOR_THEME_OPTIONS,
  type EditorThemeName,
} from "@/components/latex/editor-extensions";
import { createLatexCompletionSource } from "@/components/latex/autocomplete-source";
import { latexLintSource } from "@/components/latex/lint-source";
import { createSpellcheckExtension, type SpellcheckContextMenuInfo } from "@/components/latex/spellcheck-extension";
import { createJumpToDefinitionExtension, type JumpTarget } from "@/components/latex/jump-to-definition";
import { createEquationHoverExtension } from "@/components/latex/equation-hover";
import { createCiteContextExtension } from "@/components/latex/cite-context";
import { findLabels, countWords, wrapSelection } from "@/components/latex/latex-utils";
import { jumpToFileLine } from "@/components/latex/jump-helpers";

import { SpellcheckContextMenu } from "@/components/latex/spellcheck-context-menu";
import { GoToLineDialog } from "@/components/latex/go-to-line-dialog";
import { ProjectFindReplaceDialog } from "@/components/latex/project-find-replace-dialog";
import { TableGeneratorDialog } from "@/components/latex/table-generator-dialog";
import { MathSymbolPalette } from "@/components/latex/math-symbol-palette";
import { RenameSymbolDialog } from "@/components/latex/rename-symbol-dialog";
import { SplitPaneEditor } from "@/components/latex/split-pane-editor";
import { FigureInsertDialog } from "@/components/latex/figure-insert-dialog";
import type { EditorToolsState } from "@/components/editor/use-editor-tools-state";

export function EditorToolbar({ tools }: { tools: EditorToolsState }) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const editorTheme = useUiStore((s) => s.editorTheme) as EditorThemeName;
  const setEditorTheme = useUiStore((s) => s.setEditorTheme);
  const projectId = useWorkspaceStore((s) => s.projectId);
  const editorHandle = useWorkspaceStore((s) => s.editorHandle);
  const activeFileId = useWorkspaceStore((s) => s.activeFileId);
  const fileContents = useWorkspaceStore((s) => s.fileContents);
  const setCitationPickerOpen = useWorkspaceStore((s) => s.setCitationPickerOpen);
  const layoutMode = useWorkspaceStore((s) => s.layoutMode);
  const setLayoutMode = useWorkspaceStore((s) => s.setLayoutMode);

  const {
    lineNumbersVisible,
    showWhitespace,
    keybindingMode,
    lintEnabled,
    spellcheckEnabled,
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
  } = tools;

  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState(true);

  const [contextMenu, setContextMenu] = useState<SpellcheckContextMenuInfo | null>(null);
  const dictionarySet = useMemo(() => new Set(dictionary), [dictionary]);

  const [bibEntries, setBibEntries] = useState<BibEntry[]>([]);
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    // Was hardcoded to the demo project's bib file regardless of which
    // project was actually open — citation autocomplete always suggested
    // the shared demo's citation keys instead of this project's own.
    getReferencesFile(projectId)
      .then((file) => listBibEntries(file.id))
      .then((entries) => {
        if (!cancelled) setBibEntries(entries);
      })
      .catch(() => {
        if (!cancelled) setBibEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [tableGeneratorOpen, setTableGeneratorOpen] = useState(false);
  const [figureInsertOpen, setFigureInsertOpen] = useState(false);

  const [excludeComments, setExcludeComments] = useState(true);
  const [excludeCommands, setExcludeCommands] = useState(true);

  const completionSource = useMemo(
    () => createLatexCompletionSource(() => useWorkspaceStore.getState().files, () => bibEntries),
    [bibEntries]
  );

  async function handleJump(target: JumpTarget) {
    const state = useWorkspaceStore.getState();
    if (target.kind === "cite") {
      const entry = bibEntries.find((b) => b.key === target.name);
      if (entry) {
        toast.info(`\\cite{${target.name}} → ${entry.fields.title ?? entry.type} (references.bib)`);
      } else {
        toast.warning(`No bibliography entry found for "${target.name}"`);
      }
      return;
    }

    const activeContent = state.activeFileId ? (state.fileContents[state.activeFileId] ?? "") : "";
    const localLabel = findLabels(activeContent).find((l) => l.name === target.name);
    if (localLabel) {
      state.editorHandle?.scrollToLine(localLabel.line);
      return;
    }

    for (const file of state.files) {
      if (file.id === state.activeFileId || file.type !== "file" || file.isBinary) continue;
      let content: string;
      try {
        content = state.fileContents[file.id] ?? (await getFileContent(file.id));
      } catch {
        // A file whose content can't be decrypted just isn't searchable —
        // skip it rather than aborting the label search for every other
        // file after it.
        continue;
      }
      const label = findLabels(content).find((l) => l.name === target.name);
      if (label) {
        toast.info(`\\label{${target.name}} found in ${file.name} — opening…`);
        await jumpToFileLine(file.id, label.line);
        return;
      }
    }
    toast.warning(`No \\label{${target.name}} found in the project`);
  }

  useEffect(() => {
    if (!editorHandle) return;
    const view = editorHandle.getView();
    if (!view) return;

    applyExtensionState(view, {
      fontSize: buildFontSizeExtension(fontSize),
      wordWrap: buildWordWrapExtension(wordWrap),
      lineNumbers: buildLineNumbersExtension(lineNumbersVisible),
      whitespace: buildWhitespaceExtension(showWhitespace),
      keybinding: buildKeybindingExtension(keybindingMode),
      spellcheck: createSpellcheckExtension({
        enabled: spellcheckEnabled,
        customDictionary: dictionarySet,
        onContextMenu: setContextMenu,
      }),
      autocomplete: buildAutocompleteExtension(true, [completionSource]),
      lint: buildLintExtension(lintEnabled, latexLintSource),
      jump: createJumpToDefinitionExtension(handleJump),
      hover: createEquationHoverExtension(),
      citeContext: createCiteContextExtension((ctx) => useWorkspaceStore.getState().setCursorContext(ctx)),
      theme: buildThemeExtension(editorTheme, resolvedTheme === "dark"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editorHandle,
    fontSize,
    wordWrap,
    lineNumbersVisible,
    showWhitespace,
    keybindingMode,
    spellcheckEnabled,
    dictionarySet,
    lintEnabled,
    completionSource,
    editorTheme,
    resolvedTheme,
  ]);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setGoToLineOpen(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === "b") {
          e.preventDefault();
          format("\\textbf{", "}");
          return;
        }
        if (key === "i") {
          e.preventDefault();
          format("\\textit{", "}");
          return;
        }
        if (key === "u") {
          e.preventDefault();
          format("\\underline{", "}");
          return;
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.altKey) {
        if (e.key === "1") {
          e.preventDefault();
          format("\\section{", "}");
          return;
        }
        if (e.key === "2") {
          e.preventDefault();
          format("\\subsection{", "}");
          return;
        }
        if (e.key === "3") {
          e.preventDefault();
          format("\\subsubsection{", "}");
          return;
        }
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorHandle]);

  const activeContent = activeFileId ? (fileContents[activeFileId] ?? "") : "";
  const wordCount = useMemo(
    () => countWords(activeContent, excludeComments, excludeCommands),
    [activeContent, excludeComments, excludeCommands]
  );
  const maxLine = activeContent ? activeContent.split("\n").length : 0;
  const labels = useMemo(() => findLabels(activeContent), [activeContent]);

  function format(before: string, after: string) {
    const view = editorHandle?.getView();
    if (!view) return;
    wrapSelection(view, before, after);
  }

  function insertEquation() {
    editorHandle?.insertAtCursor("\\begin{equation}\n  \n\\end{equation}\n");
  }

  function insertCrossReference(label: string) {
    editorHandle?.insertAtCursor(`\\ref{${label}}`);
    toast.success(`Inserted \\ref{${label}}`);
  }

  return (
    <div className="flex flex-col">
      {/* Command bar — the primary, high-priority actions for the research/writing workflow. */}
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/20 px-2 py-1.5">
        <Button variant="ghost" size="icon-sm" title="Undo" onClick={() => editorHandle?.getView() && cmUndo(editorHandle.getView()!)}>
          <Undo2Icon />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Redo" onClick={() => editorHandle?.getView() && cmRedo(editorHandle.getView()!)}>
          <Redo2Icon />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-1" disabled={!editorHandle} />}>
            <PlusIcon className="size-3.5" />
            Insert
            <ChevronDownIcon className="size-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setCitationPickerOpen(true)}>
              <QuoteIcon />
              Citation
              <span className="ml-auto text-[10px] text-muted-foreground">⌘⇧C</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFigureInsertOpen(true)}>
              <ImageIcon />
              Figure
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTableGeneratorOpen(true)}>
              <Table2Icon />
              Table
            </DropdownMenuItem>
            <DropdownMenuItem onClick={insertEquation}>
              <SigmaIcon />
              Equation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Base UI requires GroupLabel to live inside a Group (it reads
                its context from there) — this was previously a bare
                DropdownMenuLabel with no wrapping DropdownMenuGroup, which
                threw ("MenuGroupContext is missing") the instant this menu
                opened and silently killed the whole popup. That's why the
                Insert button looked like it "did nothing" when clicked. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
                Cross-reference
              </DropdownMenuLabel>
              {labels.length === 0 ? (
                <DropdownMenuItem disabled>
                  <Link2Icon />
                  No \label{"{}"} targets in this file
                </DropdownMenuItem>
              ) : (
                labels.slice(0, 8).map((l) => (
                  <DropdownMenuItem key={l.name} onClick={() => insertCrossReference(l.name)}>
                    <Link2Icon />
                    {l.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon-sm"
          title="Cite (⌘⇧C)"
          onClick={() => setCitationPickerOpen(true)}
        >
          <QuoteIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Find & replace in project" onClick={() => setFindReplaceOpen(true)}>
          <SearchIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Review"
          disabled={!projectId}
          onClick={() => projectId && router.push(`/projects/${projectId}/review`)}
        >
          <ClipboardCheckIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title={layoutMode === "editor-only" ? "Show PDF preview" : "Hide PDF preview"}
          onClick={() => setLayoutMode(layoutMode === "editor-only" ? "split" : "editor-only")}
        >
          <PanelRightIcon />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Word/Office-style ribbon: formatting stays as always-visible
            one-click buttons (not hidden behind a dropdown) since there's
            free space in this row. Same format()/wrapSelection() handler as
            before; each also has a keyboard shortcut (registered below). */}
        <Button variant="ghost" size="icon-sm" title="Bold (Ctrl+B)" disabled={!editorHandle} onClick={() => format("\\textbf{", "}")}>
          <BoldIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Italic (Ctrl+I)" disabled={!editorHandle} onClick={() => format("\\textit{", "}")}>
          <ItalicIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Underline (Ctrl+U)" disabled={!editorHandle} onClick={() => format("\\underline{", "}")}>
          <UnderlineIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Section (Ctrl+Alt+1)" disabled={!editorHandle} onClick={() => format("\\section{", "}")}>
          <Heading1Icon />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Subsection (Ctrl+Alt+2)" disabled={!editorHandle} onClick={() => format("\\subsection{", "}")}>
          <Heading2Icon />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Subsubsection (Ctrl+Alt+3)" disabled={!editorHandle} onClick={() => format("\\subsubsection{", "}")}>
          <Heading3Icon />
        </Button>

        <div className="flex items-center gap-0.5 rounded-md border px-0.5" title="Font size">
          <Button variant="ghost" size="icon-xs" title="Decrease font size" onClick={() => setFontSize((s) => Math.max(10, s - 1))}>
            <MinusIcon />
          </Button>
          <span className="w-6 text-center text-xs tabular-nums">{fontSize}</span>
          <Button variant="ghost" size="icon-xs" title="Increase font size" onClick={() => setFontSize((s) => Math.min(28, s + 1))}>
            <PlusIcon />
          </Button>
        </div>

        <Toggle size="sm" pressed={wordWrap} onPressedChange={setWordWrap} title="Word wrap" aria-label="Word wrap">
          <WrapTextIcon />
        </Toggle>

        <div className="ml-auto flex items-center gap-1">
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="ghost" size="sm" className="gap-1 text-xs" title="Word count">
                  <TypeIcon className="size-3.5" />
                  {wordCount.words}w
                </Button>
              }
            />
            <PopoverContent className="w-56">
              <PopoverHeader>
                <PopoverTitle>Word count</PopoverTitle>
              </PopoverHeader>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                <span className="text-muted-foreground">Words</span>
                <span className="text-right tabular-nums">{wordCount.words}</span>
                <span className="text-muted-foreground">Characters</span>
                <span className="text-right tabular-nums">{wordCount.characters}</span>
                <span className="text-muted-foreground">Chars (no spaces)</span>
                <span className="text-right tabular-nums">{wordCount.charactersNoSpaces}</span>
              </div>
              <label className="flex items-center justify-between text-xs text-muted-foreground">
                Exclude comments
                <Switch checked={excludeComments} onCheckedChange={setExcludeComments} className="scale-90" />
              </label>
              <label className="flex items-center justify-between text-xs text-muted-foreground">
                Exclude commands
                <Switch checked={excludeCommands} onCheckedChange={setExcludeCommands} className="scale-90" />
              </label>
            </PopoverContent>
          </Popover>

          {/* Editor color theme picker — kept as its own visible control
              (not buried in the "more tools" popover below) since choosing
              an editor theme is a headline ask, not a rare settings tweak. */}
          <Select value={editorTheme} onValueChange={(v) => setEditorTheme(v as EditorThemeName)}>
            <SelectTrigger size="sm" className="h-7 gap-1 px-2 text-xs" title="Editor color theme">
              <PaletteIcon className="size-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {EDITOR_THEME_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>
      </div>

      {splitPaneOpen && <SplitPaneEditor onClose={() => setSplitPaneOpen(false)} />}

      {contextMenu && (
        <SpellcheckContextMenu
          info={contextMenu}
          onClose={() => setContextMenu(null)}
          onReplace={(replacement) => {
            const view = editorHandle?.getView();
            if (!view) return;
            view.dispatch({ changes: { from: contextMenu.from, to: contextMenu.to, insert: replacement } });
          }}
          onAddToDictionary={() =>
            setDictionary((prev) => Array.from(new Set([...prev, contextMenu.word.toLowerCase()])))
          }
        />
      )}

      <GoToLineDialog open={goToLineOpen} onOpenChange={setGoToLineOpen} editorHandle={editorHandle} maxLine={maxLine} />
      <ProjectFindReplaceDialog open={findReplaceOpen} onOpenChange={setFindReplaceOpen} />
      <TableGeneratorDialog open={tableGeneratorOpen} onOpenChange={setTableGeneratorOpen} editorHandle={editorHandle} />
      <MathSymbolPalette open={symbolPaletteOpen} onOpenChange={setSymbolPaletteOpen} editorHandle={editorHandle} />
      <FigureInsertDialog open={figureInsertOpen} onOpenChange={setFigureInsertOpen} editorHandle={editorHandle} />
      <RenameSymbolDialog open={renameOpen} onOpenChange={setRenameOpen} />
    </div>
  );
}
