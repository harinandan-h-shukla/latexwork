import type { CompletionContext, CompletionResult, Completion } from "@codemirror/autocomplete";
import { snippetCompletion } from "@codemirror/autocomplete";
import type { ProjectFile, BibEntry } from "@/lib/types";
import { findLabels } from "@/components/latex/latex-utils";
import { LATEX_COMMANDS, LATEX_ENVIRONMENTS, LATEX_PACKAGES } from "@/components/latex/latex-symbols";

const SNIPPETS: Completion[] = [
  snippetCompletion("\\begin{${1:environment}}\n\t${0}\n\\end{${1:environment}}", {
    label: "beg",
    detail: "environment (Tab to expand)",
    type: "keyword",
  }),
  snippetCompletion("\\section{${1:title}}\n${0}", {
    label: "sec",
    detail: "\\section{} (Tab to expand)",
    type: "keyword",
  }),
  snippetCompletion(
    "\\begin{figure}[${1:htbp}]\n\t\\centering\n\t\\includegraphics[width=${2:0.8}\\linewidth]{${3:path}}\n\t\\caption{${4:caption}}\n\t\\label{fig:${5:label}}\n\\end{figure}\n${0}",
    { label: "fig", detail: "figure environment (Tab to expand)", type: "keyword" }
  ),
  snippetCompletion(
    "\\begin{table}[${1:htbp}]\n\t\\centering\n\t\\begin{tabular}{${2:c c}}\n\t\t${0}\n\t\\end{tabular}\n\t\\caption{${3:caption}}\n\\end{table}",
    { label: "tab", detail: "table environment (Tab to expand)", type: "keyword" }
  ),
  snippetCompletion("\\begin{equation}\n\t${0}\n\\end{equation}", {
    label: "eq",
    detail: "equation environment (Tab to expand)",
    type: "keyword",
  }),
  snippetCompletion("\\item ${0}", { label: "item", detail: "\\item (Tab to expand)", type: "keyword" }),
];

function wordBefore(context: CompletionContext, regex: RegExp) {
  return context.matchBefore(regex);
}

export function createLatexCompletionSource(getFiles: () => ProjectFile[], getBibEntries: () => BibEntry[]) {
  return async function latexCompletionSource(context: CompletionContext): Promise<CompletionResult | null> {
    const line = context.state.doc.lineAt(context.pos);
    const textBefore = line.text.slice(0, context.pos - line.from);

    const envMatch = /\\begin\{([a-zA-Z*]*)$/.exec(textBefore);
    if (envMatch) {
      const from = context.pos - envMatch[1].length;
      return {
        from,
        options: LATEX_ENVIRONMENTS.map((name) => ({ label: name, type: "class", apply: `${name}}` })),
        validFor: /^[a-zA-Z*]*$/,
      };
    }

    const packageMatch = /\\usepackage(?:\[[^\]]*\])?\{([a-zA-Z0-9,\- ]*)$/.exec(textBefore);
    if (packageMatch) {
      const from = context.pos - packageMatch[1].length;
      return {
        from,
        options: LATEX_PACKAGES.map((name) => ({ label: name, type: "namespace", apply: `${name}}` })),
        validFor: /^[a-zA-Z0-9,\- ]*$/,
      };
    }

    const refMatch = /\\(?:ref|eqref|autoref|cref)\{([a-zA-Z0-9:_\-]*)$/.exec(textBefore);
    if (refMatch) {
      const from = context.pos - refMatch[1].length;
      const content = context.state.doc.toString();
      const labels = findLabels(content);
      return {
        from,
        options: labels.map((l) => ({ label: l.name, type: "variable", detail: `line ${l.line}`, apply: `${l.name}}` })),
        validFor: /^[a-zA-Z0-9:_\-]*$/,
      };
    }

    const citeMatch = /\\cite[tp]?\*?(?:\[[^\]]*\])?\{([a-zA-Z0-9,:_\- ]*)$/.exec(textBefore);
    if (citeMatch) {
      const from = context.pos - citeMatch[1].length;
      const bibEntries = getBibEntries();
      return {
        from,
        options: bibEntries.map((b) => ({
          label: b.key,
          type: "constant",
          detail: b.fields.title ?? b.type,
          apply: `${b.key}}`,
        })),
        validFor: /^[a-zA-Z0-9,:_\- ]*$/,
      };
    }

    const fileMatch = /\\(?:include|includegraphics(?:\[[^\]]*\])?|input)\{([^}]*)$/.exec(textBefore);
    if (fileMatch) {
      const from = context.pos - fileMatch[1].length;
      const files = getFiles().filter((f) => f.type === "file");
      return {
        from,
        options: files.map((f) => ({
          label: f.path.replace(/^\//, ""),
          type: "file",
          detail: f.isBinary ? "binary" : undefined,
          apply: `${f.path.replace(/^\//, "")}}`,
        })),
        validFor: /^[^}]*$/,
      };
    }

    const commandMatch = wordBefore(context, /\\[a-zA-Z]*$/);
    if (commandMatch && (commandMatch.from !== commandMatch.to || context.explicit)) {
      return {
        from: commandMatch.from + 1,
        options: LATEX_COMMANDS.map((c) => {
          const label = c.label.slice(1);
          if (!c.apply) return { label, detail: c.detail, type: "keyword" };
          const withoutSlash = c.apply.slice(1);
          if (!withoutSlash.includes("{}")) {
            return { label, detail: c.detail, type: "keyword", apply: withoutSlash };
          }
          let n = 1;
          const template = withoutSlash.replace(/\{\}/g, () => `{\${${n++}}}`);
          return snippetCompletion(template, { label, detail: c.detail, type: "keyword" });
        }),
        validFor: /^[a-zA-Z]*$/,
      };
    }

    const snippetMatch = wordBefore(context, /[a-zA-Z]+$/);
    if (snippetMatch && snippetMatch.from !== snippetMatch.to) {
      const word = context.state.sliceDoc(snippetMatch.from, snippetMatch.to);
      const matches = SNIPPETS.filter((s) => typeof s.label === "string" && s.label.startsWith(word));
      if (matches.length) {
        return { from: snippetMatch.from, options: matches, validFor: /^[a-zA-Z]*$/ };
      }
    }

    return null;
  };
}
