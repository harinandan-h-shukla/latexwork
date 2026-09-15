"use client";

import { useEffect, useState } from "react";
import { DownloadIcon, FileArchiveIcon } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReadOnlyFileList } from "@/components/workspace/read-only-file-list";
import { ChatPanel } from "@/components/collaboration/chat-panel";
import { CommentsPanel } from "@/components/collaboration/comments-panel";
import { NotesSidePanel } from "@/components/latex/notes-side-panel";
import { listFiles } from "@/lib/mock-api";
import { getLatestCompile } from "@/lib/mock-api/compile";
import { exportProject } from "@/lib/mock-api/export";
import { triggerDownload } from "@/lib/download-utils";
import type { CompileResult, ProjectFile } from "@/lib/types";

/**
 * The website's project view — per the confirmed Phase 3 scope
 * (~/.claude/plans/cozy-spinning-toucan.md), the web app never edits or
 * compiles .tex files: it shows the project's file list, the last compiled
 * PDF (via getLatestCompile — no compile is triggered here), a zip
 * download, and chat/comments(read-only)/notes. Real editing/compiling
 * happens only in the desktop app's EditorWorkspace (see
 * components/workspace/project-workspace-gate.tsx for how the two are
 * switched between).
 */
export function ProjectViewOnlyWorkspace({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<ProjectFile[] | null>(null);
  const [compile, setCompile] = useState<CompileResult | null | undefined>(undefined);
  const [downloadingZip, setDownloadingZip] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFiles(null);
      setCompile(undefined);
      const [f, c] = await Promise.all([listFiles(projectId), getLatestCompile(projectId)]);
      if (cancelled) return;
      setFiles(f);
      setCompile(c);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function handleDownloadZip() {
    setDownloadingZip(true);
    try {
      const result = await exportProject(projectId, "zip");
      triggerDownload(result.filename, result.content, "application/zip", result.encoding);
    } finally {
      setDownloadingZip(false);
    }
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full min-h-0">
      <ResizablePanel defaultSize="18" minSize="12" maxSize="30">
        <div className="flex h-full flex-col border-r">
          <div className="border-b px-3 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Files
          </div>
          {files === null ? (
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          ) : (
            <ReadOnlyFileList files={files} />
          )}
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="52" minSize="30">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <p className="text-sm text-muted-foreground">
              {compile?.pdfUrl
                ? "Last compiled PDF — open the desktop app to edit and recompile."
                : "This project hasn't been compiled yet."}
            </p>
            <div className="flex shrink-0 gap-2">
              {compile?.pdfUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={<a href={compile.pdfUrl} download />}
                >
                  <DownloadIcon className="size-3.5" /> PDF
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleDownloadZip} disabled={downloadingZip}>
                <FileArchiveIcon className="size-3.5" /> Zip
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 bg-muted/30">
            {compile === undefined ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : compile?.pdfUrl ? (
              // A plain <iframe> (browsers render PDFs natively), not the
              // editor's pdf.js-based PdfPreview — that component is wired
              // to click-to-source/synctex, which needs an open editor this
              // page deliberately doesn't have. Known gap: if the last
              // compile that produced this URL ran through local-agent
              // (http://localhost:...) rather than the cloud compiler, a
              // real HTTPS-deployed site can't embed it (mixed-content
              // blocking) — not solved here, see desktop/README.md's "native
              // bridge" note for the underlying reason.
              <iframe src={compile.pdfUrl} title="Compiled PDF" className="h-full w-full border-0" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <p>No compiled PDF yet.</p>
                <p>Install the desktop app to edit and compile this project.</p>
              </div>
            )}
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="30" minSize="20" maxSize="45">
        <Tabs defaultValue="comments" className="flex h-full min-h-0 flex-col">
          <TabsList className="mx-3 mt-2 w-auto self-start">
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
          <TabsContent value="comments" className="min-h-0 flex-1">
            <CommentsPanel projectId={projectId} readOnly />
          </TabsContent>
          <TabsContent value="chat" className="min-h-0 flex-1">
            <ChatPanel projectId={projectId} />
          </TabsContent>
          <TabsContent value="notes" className="min-h-0 flex-1 overflow-auto">
            <NotesSidePanel projectId={projectId} />
          </TabsContent>
        </Tabs>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
