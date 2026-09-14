import type { ProjectFile } from "@/lib/types";

export interface TreeNode extends ProjectFile {
  children: TreeNode[];
}

export function buildTree(files: ProjectFile[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  for (const f of files) nodes.set(f.id, { ...f, children: [] });
  const roots: TreeNode[] = [];
  for (const f of files) {
    const node = nodes.get(f.id)!;
    if (f.parentId && nodes.has(f.parentId)) {
      nodes.get(f.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "svg"];
const TEXT_EXTENSIONS = [
  "tex",
  "bib",
  "cls",
  "sty",
  "bst",
  "csv",
  "txt",
  "md",
  "json",
  "yml",
  "yaml",
];

export function extensionOf(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

export function isImageFile(file: Pick<ProjectFile, "isBinary" | "name" | "mimeType">): boolean {
  if (!file.isBinary) return false;
  if (file.mimeType?.startsWith("image/")) return true;
  return IMAGE_EXTENSIONS.includes(extensionOf(file.name));
}

export function isLikelyBinaryUpload(name: string, mimeType: string): boolean {
  if (mimeType.startsWith("image/") || mimeType === "application/pdf") return true;
  const ext = extensionOf(name);
  if (TEXT_EXTENSIONS.includes(ext)) return false;
  if (IMAGE_EXTENSIONS.includes(ext) || ext === "pdf" || ext === "eps" || ext === "otf" || ext === "ttf") {
    return true;
  }
  return !mimeType.startsWith("text/") && mimeType !== "";
}

export function collectDescendantIds(files: ProjectFile[], rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of files) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id);
        changed = true;
      }
    }
  }
  return ids;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const THUMBNAIL_PALETTE: [string, string][] = [
  ["#f97316", "#ea580c"],
  ["#3b82f6", "#1d4ed8"],
  ["#10b981", "#047857"],
  ["#a855f7", "#7e22ce"],
  ["#ec4899", "#be185d"],
  ["#14b8a6", "#0f766e"],
];

export function thumbnailColorsFor(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return THUMBNAIL_PALETTE[hash % THUMBNAIL_PALETTE.length];
}

export function triggerTextDownload(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
