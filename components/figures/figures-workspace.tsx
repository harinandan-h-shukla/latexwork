"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2Icon, CircleIcon, CopyIcon, ImageIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FigureInsertDialog } from "@/components/latex/figure-insert-dialog";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useIsDesktopApp } from "@/lib/runtime/use-is-desktop-app";

interface FiguresWorkspaceProps {
  projectId: string;
}

export function FiguresWorkspace({ projectId }: FiguresWorkspaceProps) {
  const files = useWorkspaceStore((s) => s.files);
  const isLoadingFiles = useWorkspaceStore((s) => s.isLoadingFiles);
  const editorHandle = useWorkspaceStore((s) => s.editorHandle);
  const loadProject = useWorkspaceStore((s) => s.loadProject);
  const [insertOpen, setInsertOpen] = useState(false);
  const isDesktop = useIsDesktopApp();

  useEffect(() => {
    if (useWorkspaceStore.getState().projectId !== projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  const images = files.filter(
    (f) => f.type === "file" && f.isBinary && (f.mimeType?.startsWith("image/") ?? false),
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

  function copyFigureCode(path: string, name: string) {
    const label = `fig:${name.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-")}`;
    const code = `\\begin{figure}[htbp]\n  \\centering\n  \\includegraphics[width=0.8\\linewidth]{${path.replace(/^\//, "")}}\n  \\caption{Caption goes here.}\n  \\label{${label}}\n\\end{figure}\n`;
    navigator.clipboard?.writeText(code).catch(() => {});
    toast.success("Figure code copied");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">Figures</h2>
          <p className="text-sm text-muted-foreground">
            {images.length} image{images.length === 1 ? "" : "s"} in this project
          </p>
        </div>
        {isDesktop && (
          <Button size="sm" className="gap-1.5" onClick={() => setInsertOpen(true)}>
            <PlusIcon className="size-3.5" />
            Insert figure
          </Button>
        )}
      </div>

      {isLoadingFiles ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <ImageIcon className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDesktop ? "No figures yet — use Insert figure to upload one." : "No figures yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => {
            const referenced = referencedPaths.has(img.path.replace(/^\//, ""));
            return (
              <div key={img.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2.5">
                {img.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.thumbnailUrl} alt={img.name} className="aspect-video w-full rounded-lg object-cover" />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted">
                    <ImageIcon className="size-6 text-muted-foreground" />
                  </div>
                )}
                <p className="truncate text-xs font-medium text-foreground">{img.name}</p>
                <Badge
                  variant={referenced ? "secondary" : "outline"}
                  className="w-fit gap-1 text-[10px]"
                >
                  {referenced ? <CheckCircle2Icon className="size-2.5" /> : <CircleIcon className="size-2.5" />}
                  {referenced ? "Referenced" : "Not referenced"}
                </Badge>
                <Button
                  size="xs"
                  variant="outline"
                  className="gap-1"
                  onClick={() => copyFigureCode(img.path, img.name)}
                >
                  <CopyIcon className="size-3" />
                  Copy figure code
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {isDesktop && (
        <FigureInsertDialog open={insertOpen} onOpenChange={setInsertOpen} editorHandle={editorHandle} />
      )}
    </div>
  );
}
