// Compartment-based extension plumbing for injecting LaTeX-intelligence
// features into an already-mounted CodeEditor without touching code-editor.tsx
// or editor-workspace.tsx. See EditorToolbar for how these are wired up.
import { Compartment, StateEffect, type Extension } from "@codemirror/state";
import { EditorView, highlightWhitespace, highlightTrailingWhitespace, keymap } from "@codemirror/view";
import { autocompletion, type CompletionSource } from "@codemirror/autocomplete";
import { linter, lintGutter, type LintSource } from "@codemirror/lint";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { emacsStyleKeymap } from "@codemirror/commands";
import { vim } from "@replit/codemirror-vim";
import { oneDark } from "@codemirror/theme-one-dark";
import { tags as t } from "@lezer/highlight";

export const fontSizeCompartment = new Compartment();
export const wordWrapCompartment = new Compartment();
export const lineNumbersCompartment = new Compartment();
export const whitespaceCompartment = new Compartment();
export const keybindingCompartment = new Compartment();
export const spellcheckCompartment = new Compartment();
export const autocompleteCompartment = new Compartment();
export const lintCompartment = new Compartment();
export const jumpCompartment = new Compartment();
export const hoverCompartment = new Compartment();
export const themeCompartment = new Compartment();

const installedViews = new WeakSet<EditorView>();

/**
 * Installs (first call for a given view) or updates (subsequent calls) every
 * LaTeX-intelligence compartment in one dispatch. A view is only ever missing
 * these compartments the first time it mounts (editor-workspace.tsx does not
 * pass them through CodeEditor's `extensions` prop), so we bootstrap them via
 * `StateEffect.appendConfig` and reconfigure them thereafter.
 */
export function applyExtensionState(view: EditorView, values: Record<string, Extension>): void {
  const pairs: Array<[Compartment, Extension]> = [
    [fontSizeCompartment, values.fontSize ?? []],
    [wordWrapCompartment, values.wordWrap ?? []],
    [lineNumbersCompartment, values.lineNumbers ?? []],
    [whitespaceCompartment, values.whitespace ?? []],
    [keybindingCompartment, values.keybinding ?? []],
    [spellcheckCompartment, values.spellcheck ?? []],
    [autocompleteCompartment, values.autocomplete ?? []],
    [lintCompartment, values.lint ?? []],
    [jumpCompartment, values.jump ?? []],
    [hoverCompartment, values.hover ?? []],
    [themeCompartment, values.theme ?? []],
  ];

  if (!installedViews.has(view)) {
    installedViews.add(view);
    view.dispatch({ effects: StateEffect.appendConfig.of(pairs.map(([c, ext]) => c.of(ext))) });
  } else {
    view.dispatch({ effects: pairs.map(([c, ext]) => c.reconfigure(ext)) });
  }
}

export function buildFontSizeExtension(px: number): Extension {
  return EditorView.theme({
    "&": { fontSize: `${px}px` },
    ".cm-gutters": { fontSize: `${px}px` },
  });
}

export function buildWordWrapExtension(wrap: boolean): Extension {
  if (wrap) return [];
  return EditorView.theme({
    ".cm-content, .cm-line": { whiteSpace: "pre !important" },
  });
}

export function buildLineNumbersExtension(visible: boolean): Extension {
  if (visible) return [];
  return EditorView.theme({
    ".cm-gutters": { display: "none" },
  });
}

export function buildWhitespaceExtension(show: boolean): Extension {
  if (!show) return [];
  return [highlightWhitespace(), highlightTrailingWhitespace()];
}

export type KeybindingMode = "default" | "vim" | "emacs";

export function buildKeybindingExtension(mode: KeybindingMode): Extension {
  if (mode === "vim") return vim();
  if (mode === "emacs") return keymap.of(emacsStyleKeymap);
  return [];
}

export function buildAutocompleteExtension(enabled: boolean, sources: CompletionSource[]): Extension {
  if (!enabled) return [];
  return autocompletion({ override: sources, activateOnTyping: true });
}

export function buildLintExtension(enabled: boolean, source: LintSource): Extension {
  if (!enabled) return [];
  return [linter(source, { delay: 400 }), lintGutter()];
}

// --- Editor color themes -------------------------------------------------
//
// Custom themes are hand-written with EditorView.theme + a HighlightStyle
// rather than pulling in a CodeMirror theme package: the app already pins
// exact @codemirror/* versions, and a couple of small first-party themes
// give full control over how they read against this app's own light/dark
// design tokens without chasing a third-party package's own compatibility
// range. `oneDark` (already a dependency) covers the dark option.

export type EditorThemeName =
  | "match-app"
  | "light"
  | "dark"
  | "high-contrast"
  | "solarized"
  | "github-light"
  | "github-dark"
  | "dracula"
  | "nord";

export const EDITOR_THEME_OPTIONS: Array<{ value: EditorThemeName; label: string }> = [
  { value: "match-app", label: "Match app theme" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark (One Dark)" },
  { value: "github-light", label: "GitHub Light" },
  { value: "github-dark", label: "GitHub Dark" },
  { value: "dracula", label: "Dracula" },
  { value: "nord", label: "Nord" },
  { value: "high-contrast", label: "High contrast" },
  { value: "solarized", label: "Solarized" },
];

const lightHighlightStyle = HighlightStyle.define([
  { tag: t.comment, color: "#6b7280", fontStyle: "italic" },
  { tag: t.keyword, color: "#7c3aed" },
  { tag: [t.name, t.variableName, t.tagName], color: "#be185d" },
  { tag: t.string, color: "#0f766e" },
  { tag: t.number, color: "#b45309" },
  { tag: [t.bracket, t.brace, t.punctuation], color: "#475569" },
]);

const lightTheme: Extension = [
  EditorView.theme(
    {
      "&": { backgroundColor: "#ffffff", color: "#1e293b" },
      ".cm-content": { caretColor: "#2563eb" },
      ".cm-gutters": { backgroundColor: "#f8fafc", color: "#94a3b8", border: "none" },
      ".cm-activeLine": { backgroundColor: "#f1f5f9" },
      ".cm-activeLineGutter": { backgroundColor: "#f1f5f9" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
        backgroundColor: "#dbeafe !important",
      },
      ".cm-cursor": { borderLeftColor: "#2563eb" },
    },
    { dark: false }
  ),
  syntaxHighlighting(lightHighlightStyle),
];

const highContrastHighlightStyle = HighlightStyle.define([
  { tag: t.comment, color: "#7CFC00", fontStyle: "italic" },
  { tag: t.keyword, color: "#FFD700", fontWeight: "bold" },
  { tag: [t.name, t.variableName, t.tagName], color: "#FF8C00" },
  { tag: t.string, color: "#00FFFF" },
  { tag: t.number, color: "#FF69B4" },
  { tag: [t.bracket, t.brace, t.punctuation], color: "#FFFFFF" },
]);

const highContrastTheme: Extension = [
  EditorView.theme(
    {
      "&": { backgroundColor: "#000000", color: "#FFFFFF" },
      ".cm-content": { caretColor: "#FFFF00" },
      ".cm-gutters": { backgroundColor: "#000000", color: "#FFFF00", border: "none", borderRight: "1px solid #FFFF00" },
      ".cm-activeLine": { backgroundColor: "#1a1a1a" },
      ".cm-activeLineGutter": { backgroundColor: "#1a1a1a", color: "#FFFF00" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
        backgroundColor: "#FFFF00 !important",
        color: "#000000 !important",
      },
      ".cm-cursor": { borderLeftColor: "#FFFF00", borderLeftWidth: "2px" },
    },
    { dark: true }
  ),
  syntaxHighlighting(highContrastHighlightStyle),
];

const solarizedHighlightStyle = HighlightStyle.define([
  { tag: t.comment, color: "#93a1a1", fontStyle: "italic" },
  { tag: t.keyword, color: "#cb4b16" },
  { tag: [t.name, t.variableName, t.tagName], color: "#268bd2" },
  { tag: t.string, color: "#2aa198" },
  { tag: t.number, color: "#d33682" },
  { tag: [t.bracket, t.brace, t.punctuation], color: "#586e75" },
]);

const solarizedTheme: Extension = [
  EditorView.theme(
    {
      "&": { backgroundColor: "#fdf6e3", color: "#657b83" },
      ".cm-content": { caretColor: "#cb4b16" },
      ".cm-gutters": { backgroundColor: "#eee8d5", color: "#93a1a1", border: "none" },
      ".cm-activeLine": { backgroundColor: "#eee8d5" },
      ".cm-activeLineGutter": { backgroundColor: "#eee8d5" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
        backgroundColor: "#eee8d5 !important",
      },
      ".cm-cursor": { borderLeftColor: "#cb4b16" },
    },
    { dark: false }
  ),
  syntaxHighlighting(solarizedHighlightStyle),
];

const githubLightHighlightStyle = HighlightStyle.define([
  { tag: t.comment, color: "#6a737d", fontStyle: "italic" },
  { tag: t.keyword, color: "#d73a49" },
  { tag: [t.name, t.variableName, t.tagName], color: "#6f42c1" },
  { tag: t.string, color: "#032f62" },
  { tag: t.number, color: "#005cc5" },
  { tag: [t.bracket, t.brace, t.punctuation], color: "#24292e" },
]);

const githubLightTheme: Extension = [
  EditorView.theme(
    {
      "&": { backgroundColor: "#ffffff", color: "#24292e" },
      ".cm-content": { caretColor: "#0969da" },
      ".cm-gutters": { backgroundColor: "#ffffff", color: "#6e7781", border: "none" },
      ".cm-activeLine": { backgroundColor: "#f6f8fa" },
      ".cm-activeLineGutter": { backgroundColor: "#f6f8fa" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
        backgroundColor: "#0969da33 !important",
      },
      ".cm-cursor": { borderLeftColor: "#0969da" },
    },
    { dark: false }
  ),
  syntaxHighlighting(githubLightHighlightStyle),
];

const githubDarkHighlightStyle = HighlightStyle.define([
  { tag: t.comment, color: "#8b949e", fontStyle: "italic" },
  { tag: t.keyword, color: "#ff7b72" },
  { tag: [t.name, t.variableName, t.tagName], color: "#d2a8ff" },
  { tag: t.string, color: "#a5d6ff" },
  { tag: t.number, color: "#79c0ff" },
  { tag: [t.bracket, t.brace, t.punctuation], color: "#c9d1d9" },
]);

const githubDarkTheme: Extension = [
  EditorView.theme(
    {
      "&": { backgroundColor: "#0d1117", color: "#c9d1d9" },
      ".cm-content": { caretColor: "#58a6ff" },
      ".cm-gutters": { backgroundColor: "#0d1117", color: "#6e7681", border: "none" },
      ".cm-activeLine": { backgroundColor: "#161b22" },
      ".cm-activeLineGutter": { backgroundColor: "#161b22" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
        backgroundColor: "#3fb95040 !important",
      },
      ".cm-cursor": { borderLeftColor: "#58a6ff" },
    },
    { dark: true }
  ),
  syntaxHighlighting(githubDarkHighlightStyle),
];

const draculaHighlightStyle = HighlightStyle.define([
  { tag: t.comment, color: "#6272a4", fontStyle: "italic" },
  { tag: t.keyword, color: "#ff79c6" },
  { tag: [t.name, t.variableName, t.tagName], color: "#50fa7b" },
  { tag: t.string, color: "#f1fa8c" },
  { tag: t.number, color: "#bd93f9" },
  { tag: [t.bracket, t.brace, t.punctuation], color: "#f8f8f2" },
]);

const draculaTheme: Extension = [
  EditorView.theme(
    {
      "&": { backgroundColor: "#282a36", color: "#f8f8f2" },
      ".cm-content": { caretColor: "#f8f8f0" },
      ".cm-gutters": { backgroundColor: "#282a36", color: "#6272a4", border: "none" },
      ".cm-activeLine": { backgroundColor: "#44475a" },
      ".cm-activeLineGutter": { backgroundColor: "#44475a" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
        backgroundColor: "#44475a !important",
      },
      ".cm-cursor": { borderLeftColor: "#f8f8f0", borderLeftWidth: "2px" },
    },
    { dark: true }
  ),
  syntaxHighlighting(draculaHighlightStyle),
];

const nordHighlightStyle = HighlightStyle.define([
  { tag: t.comment, color: "#616e88", fontStyle: "italic" },
  { tag: t.keyword, color: "#81a1c1" },
  { tag: [t.name, t.variableName, t.tagName], color: "#88c0d0" },
  { tag: t.string, color: "#a3be8c" },
  { tag: t.number, color: "#b48ead" },
  { tag: [t.bracket, t.brace, t.punctuation], color: "#d8dee9" },
]);

const nordTheme: Extension = [
  EditorView.theme(
    {
      "&": { backgroundColor: "#2e3440", color: "#d8dee9" },
      ".cm-content": { caretColor: "#88c0d0" },
      ".cm-gutters": { backgroundColor: "#2e3440", color: "#4c566a", border: "none" },
      ".cm-activeLine": { backgroundColor: "#3b4252" },
      ".cm-activeLineGutter": { backgroundColor: "#3b4252" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
        backgroundColor: "#434c5e !important",
      },
      ".cm-cursor": { borderLeftColor: "#88c0d0", borderLeftWidth: "2px" },
    },
    { dark: true }
  ),
  syntaxHighlighting(nordHighlightStyle),
];

/**
 * `"match-app"` (the default) defers to the app-level light/dark toggle from
 * next-themes, same as before this feature existed. Any other value is an
 * explicit user override and wins regardless of the app theme.
 */
export function buildThemeExtension(theme: EditorThemeName, appIsDark: boolean): Extension {
  switch (theme) {
    case "dark":
      return oneDark;
    case "light":
      return lightTheme;
    case "high-contrast":
      return highContrastTheme;
    case "solarized":
      return solarizedTheme;
    case "github-light":
      return githubLightTheme;
    case "github-dark":
      return githubDarkTheme;
    case "dracula":
      return draculaTheme;
    case "nord":
      return nordTheme;
    case "match-app":
    default:
      return appIsDark ? oneDark : lightTheme;
  }
}
