"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  ListTreeIcon,
  ImageIcon,
  FolderIcon,
  CheckCircle2Icon,
  CircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace-store";
import { getFileContent } from "@/lib/mock-api";
import { FileTree } from "@/components/file-tree/file-tree";
import { jumpToFileLine } from "@/components/latex/jump-helpers";
import { parseOutlineFlat, nestOutlineNodes, type OutlineNode } from "@/components/latex/latex-utils";
import type { ProjectFile } from "@/lib/types";

const INPUT_REGEX = /\\(?:input|include)\{([^}]+)\}/;

// Same per-level accent cycle as the file tree (components/file-tree/tree-row.tsx)
// so a \section/\subsection/\subsubsection nesting reads visually instead of
// relying on indentation + font-weight alone.
const LEVEL_GUIDE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function levelGuideStyle(level: number): CSSProperties {
  if (level === 0) return {};
  const images: string[] = [];
  const positions: string[] = [];
  const sizes: string[] = [];
  for (let i = 0; i < level; i++) {
    const color = `color-mix(in oklch, ${LEVEL_GUIDE_COLORS[i % LEVEL_GUIDE_COLORS.length]} 45%, transparent)`;
    images.push(`linear-gradient(${color}, ${color})`);
    positions.push(`${6 + i * 12 + 5}px 0`);
    sizes.push("1px 100%");
  }
  // Same faint full-row depth tint as the file tree (components/file-tree/tree-row.tsx)
  // so \section/\subsection/\subsubsection nesting reads with the same
  // ascending-by-depth coloring convention as the file/folder tree.
  const tintColor = LEVEL_GUIDE_COLORS[(level - 1) % LEVEL_GUIDE_COLORS.length];
  const tint = `color-mix(in oklch, ${tintColor} 12%, transparent)`;
  images.push(`linear-gradient(${tint}, ${tint})`);
  positions.push("0 0");
  sizes.push("100% 100%");
  return { backgroundImage: images.join(", "), backgroundPosition: positions.join(", "), backgroundSize: sizes.join(", "), backgroundRepeat: "no-repeat" };
}

/** Resolves an \input{sections/foo} / \include{sections/foo} target against
 * the project's file list — tries the path as-is and with a .tex suffix,
 * since \input commonly omits the extension. */
function resolveInputTarget(raw: string, files: ProjectFile[]): ProjectFile | null {
  let p = raw.trim();
  if (!p.startsWith("/")) p = `/${p}`;
  const candidates = p.endsWith(".tex") ? [p] : [p, `${p}.tex`];
  for (const candidate of candidates) {
    const match = files.find((f) => f.path === candidate);
    if (match) return match;
  }
  return null;
}

function CollapsibleSection({
  title,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: typeof ListTreeIcon;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground"
      >
        {open ? <ChevronDownIcon className="size-3" /> : <ChevronRightIcon className="size-3" />}
        <Icon className="size-3.5" />
        {title}
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
}

function OutlineItem({ node, onJump }: { node: OutlineNode; onJump: (node: OutlineNode) => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onJump(node)}
        className={cn(
          "w-full truncate rounded px-1.5 py-1 text-left text-sm hover:bg-muted",
          node.level === 0 && "font-semibold",
          node.level === 2 && "font-medium"
        )}
        style={{ paddingLeft: `${6 + node.level * 12}px`, ...levelGuideStyle(node.level) }}
        title={node.title}
      >
        {node.title}
      </button>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child, idx) => (
            <OutlineItem key={`${child.fileId}-${child.line}-${idx}`} node={child} onJump={onJump} />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Left column of the editor workspace: paper structure first, files second.
 * Replaces the plain file tree as the sole left panel — the tree itself is
 * unchanged and still fully there, just nested under a collapsed-by-default
 * "Files" section instead of being the only thing shown.
 */
export function ManuscriptNav() {
  const files = useWorkspaceStore((s) => s.files);
  const fileContents = useWorkspaceStore((s) => s.fileContents);
  const activeFileId = useWorkspaceStore((s) => s.activeFileId);
  const editorHandle = useWorkspaceStore((s) => s.editorHandle);

  const mainFile = useMemo(
    () => files.find((f) => f.isMain) ?? files.find((f) => f.type === "file" && f.name.endsWith(".tex")) ?? null,
    [files]
  );

  const [manuscriptOpen, setManuscriptOpen] = useState(true);
  const [figuresOpen, setFiguresOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(false);

  // Content for files that aren't necessarily open in a tab (the main file,
  // and anything it \input{}s) — fetched on demand, separate from the live
  // fileContents map which only covers currently-open files.
  const [extraContents, setExtraContents] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!mainFile) return;
    if (fileContents[mainFile.id] != null || extraContents[mainFile.id] != null) return;
    let cancelled = false;
    // Read-only outline display — a decrypt failure here (see
    // getFileContent) just means no outline for this file, not a data-loss
    // risk, so it's fine to swallow and leave extraContents unset.
    getFileContent(mainFile.id)
      .then((c) => {
        if (!cancelled) setExtraContents((prev) => ({ ...prev, [mainFile.id]: c }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainFile?.id]);

  const mainContent = mainFile ? (fileContents[mainFile.id] ?? extraContents[mainFile.id] ?? "") : "";

  // One level of \input{}/\include{} resolution — deeper nesting is out of
  // scope (see the redesign plan): fine for a typical few-chapters-per-file
  // paper, not meant to handle arbitrarily deep include trees.
  const inputTargets = useMemo(() => {
    if (!mainContent) return [] as ProjectFile[];
    const targets: ProjectFile[] = [];
    for (const line of mainContent.split("\n")) {
      const m = INPUT_REGEX.exec(line);
      if (!m) continue;
      const resolved = resolveInputTarget(m[1], files);
      if (resolved && !targets.some((t) => t.id === resolved.id)) targets.push(resolved);
    }
    return targets;
  }, [mainContent, files]);

  useEffect(() => {
    const missing = inputTargets.filter((f) => fileContents[f.id] == null && extraContents[f.id] == null);
    if (missing.length === 0) return;
    let cancelled = false;
    // allSettled: one \input{}-ed file failing to decrypt shouldn't blank
    // out the whole outline for every other input target.
    Promise.allSettled(missing.map((f) => getFileContent(f.id).then((c) => [f.id, c] as const))).then(
      (results) => {
        if (cancelled) return;
        setExtraContents((prev) => {
          const next = { ...prev };
          for (const r of results) {
            if (r.status === "fulfilled") next[r.value[0]] = r.value[1];
          }
          return next;
        });
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputTargets]);

  const outline = useMemo(() => {
    if (!mainFile || !mainContent) return [] as OutlineNode[];
    const flat: OutlineNode[] = [];
    const lines = mainContent.split("\n");
    lines.forEach((line, idx) => {
      const inputMatch = INPUT_REGEX.exec(line);
      if (inputMatch) {
        const resolved = resolveInputTarget(inputMatch[1], files);
        const childContent = resolved ? (fileContents[resolved.id] ?? extraContents[resolved.id]) : undefined;
        if (resolved && childContent != null) {
          flat.push(...parseOutlineFlat(childContent, resolved.id));
        }
        return;
      }
      const [node] = parseOutlineFlat(line, mainFile.id);
      if (node) {
        node.line = idx + 1; // parseOutlineFlat numbers relative to the single-line input it was given
        flat.push(node);
      }
    });
    return nestOutlineNodes(flat);
  }, [mainFile, mainContent, files, fileContents, extraContents]);

  function handleJump(node: OutlineNode) {
    if (!node.fileId) return;
    if (node.fileId === activeFileId && editorHandle) {
      editorHandle.scrollToLine(node.line);
    } else {
      jumpToFileLine(node.fileId, node.line);
    }
  }

  const images = useMemo(
    () => files.filter((f) => f.type === "file" && f.isBinary && (f.mimeType?.startsWith("image/") ?? false)),
    [files]
  );
  const referencedPaths = useMemo(() => {
    const paths = new Set<string>();
    const includeRegex = /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g;
    for (const f of files) {
      if (!f.content) continue;
      let match: RegExpExecArray | null;
      includeRegex.lastIndex = 0;
      while ((match = includeRegex.exec(f.content)) !== null) {
        paths.add(match[1].replace(/^\//, ""));
      }
    }
    return paths;
  }, [files]);

  return (
    <div className="flex h-full flex-col overflow-auto">
      <CollapsibleSection
        title="Manuscript"
        icon={ListTreeIcon}
        open={manuscriptOpen}
        onToggle={() => setManuscriptOpen((v) => !v)}
      >
        {outline.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            No \section, \subsection or \chapter commands found yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5 px-1">
            {outline.map((node, idx) => (
              <OutlineItem key={`${node.fileId}-${node.line}-${idx}`} node={node} onJump={handleJump} />
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Figures"
        icon={ImageIcon}
        open={figuresOpen}
        onToggle={() => setFiguresOpen((v) => !v)}
      >
        {images.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">No image files yet.</p>
        ) : (
          <ul className="flex flex-col gap-0.5 px-1">
            {images.map((img) => {
              const referenced = referencedPaths.has(img.path.replace(/^\//, ""));
              return (
                <li key={img.id} className="flex items-center gap-1.5 truncate rounded px-1.5 py-1 text-sm" title={img.name}>
                  {referenced ? (
                    <CheckCircle2Icon className="size-3 shrink-0 text-success" />
                  ) : (
                    <CircleIcon className="size-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{img.name}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Files" icon={FolderIcon} open={filesOpen} onToggle={() => setFilesOpen((v) => !v)}>
        <div className="h-72">
          <FileTree />
        </div>
      </CollapsibleSection>
    </div>
  );
}
