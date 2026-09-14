// Pure text-parsing helpers shared by the outline panel, lint source,
// autocomplete source, jump-to-definition, rename, and word-count features.

import type { EditorView } from "@codemirror/view";

/**
 * Wraps the current selection in a LaTeX command pair (e.g. `\textbf{`/`}`),
 * keeping the selection on the original text so repeated formatting commands
 * (or a mini-toolbar staying open after the edit) keep working. Shared by the
 * main editor toolbar and the floating selection mini-toolbar so both apply
 * formatting identically.
 */
export function wrapSelection(view: EditorView, before: string, after: string): void {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  view.dispatch({
    changes: { from, to, insert: `${before}${selected}${after}` },
    selection: { anchor: from + before.length, head: from + before.length + selected.length },
  });
  view.focus();
}

export interface OutlineNode {
  level: number; // 0 = part, 1 = chapter, 2 = section, 3 = subsection, 4 = subsubsection
  title: string;
  line: number; // 1-indexed
  children: OutlineNode[];
  /** Which file this heading came from — unset for a single-file outline
   * (the caller already knows which file it parsed); set when merging
   * headings from multiple files (see parseOutlineFlat + the manuscript-wide
   * outline in components/workspace/manuscript-nav.tsx). */
  fileId?: string;
}

const SECTION_COMMANDS: Array<{ command: string; level: number }> = [
  { command: "part", level: 0 },
  { command: "chapter", level: 1 },
  { command: "section", level: 2 },
  { command: "subsection", level: 3 },
  { command: "subsubsection", level: 4 },
];

const SECTION_REGEX = new RegExp(
  `\\\\(${SECTION_COMMANDS.map((s) => s.command).join("|")})\\*?\\{([^}]*)\\}`
);

/** The un-nested scan step: one flat OutlineNode per \section/\chapter/etc.
 * line, in document order, each tagged with `fileId`. Exported so callers
 * that need to splice headings from more than one file (an \input{}-ed
 * manuscript) can build one combined flat list before nesting it — see
 * nestOutlineNodes below, which both this module's parseOutline and that
 * multi-file caller share. */
export function parseOutlineFlat(content: string, fileId?: string): OutlineNode[] {
  const lines = content.split("\n");
  const flat: OutlineNode[] = [];
  lines.forEach((line, idx) => {
    const match = SECTION_REGEX.exec(line);
    if (!match) return;
    const commandInfo = SECTION_COMMANDS.find((s) => s.command === match[1]);
    if (!commandInfo) return;
    flat.push({
      level: commandInfo.level,
      title: match[2].trim() || "(untitled)",
      line: idx + 1,
      children: [],
      fileId,
    });
  });
  return flat;
}

/** Turns a flat, document-ordered list of headings (any level, possibly from
 * multiple files) into a nested tree via a level-based stack merge. */
export function nestOutlineNodes(flat: OutlineNode[]): OutlineNode[] {
  const root: OutlineNode[] = [];
  const stack: OutlineNode[] = [];
  for (const node of flat) {
    while (stack.length && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }
  return root;
}

export function parseOutline(content: string): OutlineNode[] {
  return nestOutlineNodes(parseOutlineFlat(content));
}

export function findLabels(content: string): Array<{ name: string; line: number }> {
  const labels: Array<{ name: string; line: number }> = [];
  const lines = content.split("\n");
  const regex = /\\label\{([^}]+)\}/g;
  lines.forEach((line, idx) => {
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;
    while ((match = regex.exec(line)) !== null) {
      labels.push({ name: match[1].trim(), line: idx + 1 });
    }
  });
  return labels;
}

export function findRefs(content: string): Array<{ name: string; line: number; command: string }> {
  const refs: Array<{ name: string; line: number; command: string }> = [];
  const lines = content.split("\n");
  const regex = /\\(ref|eqref|autoref|cref)\{([^}]+)\}/g;
  lines.forEach((line, idx) => {
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;
    while ((match = regex.exec(line)) !== null) {
      refs.push({ command: match[1], name: match[2].trim(), line: idx + 1 });
    }
  });
  return refs;
}

export function findCites(content: string): Array<{ keys: string[]; line: number }> {
  const cites: Array<{ keys: string[]; line: number }> = [];
  const lines = content.split("\n");
  const regex = /\\cite[tp]?\*?(?:\[[^\]]*\])?\{([^}]+)\}/g;
  lines.forEach((line, idx) => {
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;
    while ((match = regex.exec(line)) !== null) {
      cites.push({ keys: match[1].split(",").map((k) => k.trim()).filter(Boolean), line: idx + 1 });
    }
  });
  return cites;
}

export function stripComments(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      // strip a %-comment that is not escaped with a backslash
      let result = "";
      for (let i = 0; i < line.length; i++) {
        if (line[i] === "%" && line[i - 1] !== "\\") break;
        result += line[i];
      }
      return result;
    })
    .join("\n");
}

export function stripCommands(content: string): string {
  return content.replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})*/g, " ");
}

export interface WordCountResult {
  words: number;
  characters: number;
  charactersNoSpaces: number;
}

export function countWords(content: string, excludeComments: boolean, excludeCommands: boolean): WordCountResult {
  let text = content;
  if (excludeComments) text = stripComments(text);
  if (excludeCommands) text = stripCommands(text);
  const trimmed = text.trim();
  const words = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).filter(Boolean).length;
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s+/g, "").length;
  return { words, characters, charactersNoSpaces };
}

export interface BraceIssue {
  line: number; // 1-indexed
  ch: number; // 0-indexed column
  message: string;
}

export function findUnmatchedBraces(content: string): BraceIssue[] {
  const issues: BraceIssue[] = [];
  const stack: Array<{ line: number; ch: number }> = [];
  const lines = content.split("\n");
  lines.forEach((line, lineIdx) => {
    for (let ch = 0; ch < line.length; ch++) {
      const c = line[ch];
      if (c === "%" && line[ch - 1] !== "\\") break;
      if (c === "\\") {
        ch++; // skip escaped char
        continue;
      }
      if (c === "{") stack.push({ line: lineIdx + 1, ch });
      else if (c === "}") {
        if (stack.length === 0) {
          issues.push({ line: lineIdx + 1, ch, message: "Unmatched closing brace }" });
        } else {
          stack.pop();
        }
      }
    }
  });
  for (const unclosed of stack) {
    issues.push({ line: unclosed.line, ch: unclosed.ch, message: "Unmatched opening brace {" });
  }
  return issues;
}

const RENAMEABLE_COMMANDS = "label|ref|eqref|autoref|cref|cite[tp]?\\*?|begin|end";

export function countSymbolOccurrences(content: string, name: string): number {
  if (!name) return 0;
  const regex = new RegExp(`\\\\(?:${RENAMEABLE_COMMANDS})(?:\\[[^\\]]*\\])?\\{([^}]*)\\}`, "g");
  let count = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const keys = match[1].split(",").map((k) => k.trim());
    count += keys.filter((k) => k === name).length;
  }
  return count;
}

export function renameSymbolInContent(content: string, oldName: string, newName: string): { content: string; count: number } {
  if (!oldName) return { content, count: 0 };
  let count = 0;
  const regex = new RegExp(`(\\\\(?:${RENAMEABLE_COMMANDS})(?:\\[[^\\]]*\\])?\\{)([^}]*)(\\})`, "g");
  const next = content.replace(regex, (full, prefix, inner, suffix) => {
    const keys = inner.split(",").map((k: string) => k.trim());
    const renamed = keys.map((k: string) => {
      if (k === oldName) {
        count++;
        return newName;
      }
      return k;
    });
    return `${prefix}${renamed.join(",")}${suffix}`;
  });
  return { content: next, count };
}

export interface EnvironmentIssue {
  line: number;
  name: string;
  message: string;
}

export function findUnmatchedEnvironments(content: string): EnvironmentIssue[] {
  const issues: EnvironmentIssue[] = [];
  const stack: Array<{ line: number; name: string }> = [];
  const lines = content.split("\n");
  const regex = /\\(begin|end)\{([^}]+)\}/g;
  lines.forEach((line, lineIdx) => {
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;
    while ((match = regex.exec(line)) !== null) {
      const [, kind, name] = match;
      if (kind === "begin") {
        stack.push({ line: lineIdx + 1, name });
      } else {
        const top = stack[stack.length - 1];
        if (top && top.name === name) {
          stack.pop();
        } else {
          issues.push({ line: lineIdx + 1, name, message: `\\end{${name}} does not match the last \\begin{...}` });
        }
      }
    }
  });
  for (const unclosed of stack) {
    issues.push({ line: unclosed.line, name: unclosed.name, message: `\\begin{${unclosed.name}} is never closed` });
  }
  return issues;
}
