"use client";

import { useMemo } from "react";
import { ListTreeIcon } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { parseOutline, type OutlineNode } from "@/components/latex/latex-utils";
import { cn } from "@/lib/utils";

function OutlineItem({ node }: { node: OutlineNode }) {
  const editorHandle = useWorkspaceStore((s) => s.editorHandle);

  return (
    <li>
      <button
        type="button"
        onClick={() => editorHandle?.scrollToLine(node.line)}
        className={cn(
          "w-full truncate rounded px-1.5 py-1 text-left text-sm hover:bg-muted",
          node.level === 0 && "font-semibold",
          node.level === 2 && "font-medium"
        )}
        style={{ paddingLeft: `${6 + node.level * 12}px` }}
        title={node.title}
      >
        {node.title}
        <span className="ml-1.5 text-xs text-muted-foreground">L{node.line}</span>
      </button>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child, idx) => (
            <OutlineItem key={`${child.line}-${idx}`} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OutlinePanel({ projectId }: { projectId: string }) {
  const activeFileId = useWorkspaceStore((s) => s.activeFileId);
  const fileContents = useWorkspaceStore((s) => s.fileContents);
  const files = useWorkspaceStore((s) => s.files);

  const content = activeFileId ? (fileContents[activeFileId] ?? "") : "";
  const outline = useMemo(() => parseOutline(content), [content]);
  const activeFile = files.find((f) => f.id === activeFileId);

  if (!activeFileId) {
    return (
      <div className="p-3 text-sm text-muted-foreground">Open a file in project {projectId} to see its outline.</div>
    );
  }

  if (outline.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
        <ListTreeIcon className="size-5" />
        No \section, \subsection or \chapter commands found in {activeFile?.name ?? "this file"}.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-0.5 p-1.5">
      {outline.map((node, idx) => (
        <OutlineItem key={`${node.line}-${idx}`} node={node} />
      ))}
    </ul>
  );
}
