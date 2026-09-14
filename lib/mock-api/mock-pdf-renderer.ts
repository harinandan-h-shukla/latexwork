import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 64;
const BODY_SIZE = 11;
const LINE_HEIGHT = 15;

interface Block {
  kind: "title" | "h1" | "h2" | "body";
  text: string;
}

/** Minimal shape the renderer needs — deliberately not lib/types.ts's ProjectFile, so callers
 * (live compile preview, export) can pass files from wherever they actually live (Zustand store,
 * real MongoDB, the legacy in-memory mock) without this module reaching into any of them itself. */
export interface RenderableFile {
  id: string;
  path: string;
  name: string;
  content: string;
  isMain: boolean;
}

const INPUT_REGEX = /\\(?:input|include)\{([^}]+)\}/g;

function normalizeTexPath(p: string): string {
  const noLeadingSlash = p.replace(/^\//, "");
  return noLeadingSlash.endsWith(".tex") ? noLeadingSlash : `${noLeadingSlash}.tex`;
}

function findByInputPath(files: RenderableFile[], inputPath: string): RenderableFile | undefined {
  const target = normalizeTexPath(inputPath);
  return files.find((f) => f.path.replace(/^\//, "") === target || f.name === target);
}

/**
 * Recursively expands \input{} and \include{} so newly-created files pulled
 * into the main document the normal multi-file way actually show up in the
 * mock compile — the mock renderer otherwise only ever saw the main file's
 * own text. Cycle-guarded; an unresolved reference is dropped rather than
 * left as literal LaTeX (stripLatex doesn't know that command).
 */
function resolveIncludes(content: string, files: RenderableFile[], visited: Set<string>): string {
  return content.replace(INPUT_REGEX, (match, rawPath: string) => {
    const target = findByInputPath(files, rawPath);
    if (!target || !target.content || visited.has(target.id)) return "";
    const nextVisited = new Set(visited).add(target.id);
    return resolveIncludes(target.content, files, nextVisited);
  });
}

function stripLatex(source: string): Block[] {
  let text = source
    .replace(/%.*$/gm, "")
    .replace(/\\documentclass(\[[^\]]*\])?\{[^}]*\}/g, "")
    .replace(/\\usepackage(\[[^\]]*\])?\{[^}]*\}/g, "")
    .replace(/\\(begin|end)\{document\}/g, "")
    .replace(/\\maketitle/g, "")
    .replace(/\\label\{[^}]*\}/g, "")
    .replace(/\\(textbf|textit|emph|underline)\{([^}]*)\}/g, "$2")
    .replace(/\\cite[tp]?\*?(?:\[[^\]]*\])?\{([^}]*)\}/g, "[$1]")
    .replace(/\\ref\{([^}]*)\}/g, "[$1]")
    .replace(/\\(begin|end)\{[a-zA-Z*]+\}/g, "");

  const blocks: Block[] = [];
  const titleMatch = /\\title\{([^}]*)\}/.exec(text);
  const authorMatch = /\\author\{([^}]*)\}/.exec(text);
  text = text.replace(/\\title\{[^}]*\}/g, "").replace(/\\author\{[^}]*\}/g, "");
  if (titleMatch) blocks.push({ kind: "title", text: titleMatch[1].trim() });
  if (authorMatch) blocks.push({ kind: "body", text: authorMatch[1].trim() });

  const lines = text.split("\n");
  for (const rawLine of lines) {
    const sectionMatch = /\\section\*?\{([^}]*)\}/.exec(rawLine);
    const subsectionMatch = /\\subsection\*?\{([^}]*)\}/.exec(rawLine);
    if (sectionMatch) {
      blocks.push({ kind: "h1", text: sectionMatch[1].trim() });
      continue;
    }
    if (subsectionMatch) {
      blocks.push({ kind: "h2", text: subsectionMatch[1].trim() });
      continue;
    }
    const cleaned = rawLine.replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})?/g, "").trim();
    if (cleaned) blocks.push({ kind: "body", text: cleaned });
  }
  return blocks;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(trial, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Pure PDF-bytes generation, reused by both the live compile preview (blob URL) and export (download). */
export async function renderMockPdfBytes(
  files: RenderableFile[],
  emptyStateTitle = "Untitled document",
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  const mainFile = files.find((f) => f.isMain) ?? files.find((f) => f.name.endsWith(".tex"));
  const expanded = mainFile?.content
    ? resolveIncludes(mainFile.content, files, new Set([mainFile.id]))
    : "";
  const blocks = expanded ? stripLatex(expanded) : [];

  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursorY = PAGE_HEIGHT - MARGIN;
  const maxWidth = PAGE_WIDTH - MARGIN * 2;

  function ensureSpace(needed: number) {
    if (cursorY - needed < MARGIN) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      cursorY = PAGE_HEIGHT - MARGIN;
    }
  }

  function drawLines(text: string, font: PDFFont, size: number, gapAfter: number, color = rgb(0.08, 0.09, 0.12)) {
    const lines = wrapText(text, font, size, maxWidth);
    for (const line of lines) {
      ensureSpace(LINE_HEIGHT);
      page.drawText(line, { x: MARGIN, y: cursorY, size, font, color });
      cursorY -= LINE_HEIGHT;
    }
    cursorY -= gapAfter;
  }

  if (blocks.length === 0) {
    drawLines(emptyStateTitle, bold, 20, 20);
    drawLines("Nothing to compile yet — add some LaTeX source to see it here.", regular, BODY_SIZE, 0);
  } else {
    for (const block of blocks) {
      if (block.kind === "title") drawLines(block.text, bold, 20, 18);
      else if (block.kind === "h1") drawLines(block.text, bold, 14, 8);
      else if (block.kind === "h2") drawLines(block.text, bold, 12, 6);
      else drawLines(block.text, regular, BODY_SIZE, 4);
    }
  }

  ensureSpace(LINE_HEIGHT * 2);
  cursorY -= LINE_HEIGHT;
  page.drawText(
    `Mock cloud compile — approximate rendering, not real LaTeX typesetting · ${new Date().toLocaleTimeString()}`,
    { x: MARGIN, y: MARGIN / 2, size: 8, font: regular, color: rgb(0.5, 0.5, 0.55) }
  );

  const bytes = await doc.save();
  return { bytes, pageCount: doc.getPageCount() };
}

/** Live-preview variant: same real PDF bytes, wrapped as a blob URL (browser-only). */
export async function renderMockPdf(
  files: RenderableFile[],
  emptyStateTitle?: string,
): Promise<{ url: string; pageCount: number }> {
  const { bytes, pageCount } = await renderMockPdfBytes(files, emptyStateTitle);
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  return { url: URL.createObjectURL(blob), pageCount };
}
