"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileTextIcon,
  LayoutListIcon,
  MaximizeIcon,
  MinimizeIcon,
  MinusIcon,
  PlusIcon,
  PrinterIcon,
  ScanIcon,
  SearchIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CompileLogEntry, SyncTexMapping } from "@/lib/types";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useLogFilterStore } from "@/components/compile/log-filter-store";
import { synctexForward, synctexInverse } from "@/lib/local-compiler/compiler-service";

interface PdfPreviewProps {
  pdfUrl: string | null;
  isCompiling: boolean;
}

function entryYFraction(entry: CompileLogEntry, synctex: SyncTexMapping[]): number {
  if (entry.fileId && entry.line !== undefined) {
    const matches = synctex.filter((m) => m.fileId === entry.fileId);
    if (matches.length > 0) {
      let nearest = matches[0];
      let bestDist = Math.abs(matches[0].line - entry.line);
      for (const m of matches) {
        const dist = Math.abs(m.line - entry.line);
        if (dist < bestDist) {
          bestDist = dist;
          nearest = m;
        }
      }
      return nearest.y;
    }
  }
  let hash = 0;
  for (let i = 0; i < entry.id.length; i++) hash = (hash * 31 + entry.id.charCodeAt(i)) >>> 0;
  return 0.1 + (hash % 800) / 1000;
}

async function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number
): Promise<void> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const context = canvas.getContext("2d");
  if (!context) return;
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvas, canvasContext: context, viewport }).promise;
}

export function PdfPreview({ pdfUrl, isCompiling }: PdfPreviewProps) {
  const compile = useWorkspaceStore((s) => s.compile);
  const focusEntry = useLogFilterStore((s) => s.focusEntry);
  const setActiveSidePanel = useWorkspaceStore((s) => s.setActiveSidePanel);
  const syncTargetLine = useWorkspaceStore((s) => s.syncTargetLine);
  const [syncMarkerY, setSyncMarkerY] = useState<number | null>(null);

  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const pageWrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const currentPageRef = useRef(1);

  // Continuous mode never renders every page up front — a 15-page demo and a
  // 15,000-page document cost the same here. An IntersectionObserver tracks
  // which page slots are actually scrolled into view (±RENDER_BUFFER pages),
  // and only those get rasterized; everything else is a correctly-sized
  // blank placeholder so scroll position/scrollbar height stay accurate.
  const RENDER_BUFFER = 3;
  const [visiblePageRange, setVisiblePageRange] = useState<{ min: number; max: number }>({ min: 1, max: 1 });
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const renderedPagesRef = useRef<Set<number>>(new Set());
  const renderingPagesRef = useRef<Set<number>>(new Set());

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState(1.1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [continuous, setContinuous] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ page: number; count: number }[]>([]);

  const claimedPageCount = compile?.pageCount != null ? Math.max(1, compile.pageCount) : null;
  const clampedTotal = pdfDoc
    ? claimedPageCount != null
      ? Math.min(claimedPageCount, pdfDoc.numPages)
      : pdfDoc.numPages
    : (claimedPageCount ?? 1);
  const synctex = compile?.synctex ?? [];

  useEffect(() => {
    if (!pdfUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
        const doc = await loadingTask.promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setError(null);
        setSearchResults([]);
        // Only jump to page 1 on the very first load — on every recompile
        // after that (auto-compile fires on every save), keep whatever page
        // the user was already reading, clamped to the new page count. A
        // reader mid-document shouldn't get bounced back to page 1 because
        // they fixed a typo elsewhere.
        const clamped = Math.max(1, Math.min(currentPageRef.current, doc.numPages));
        setCurrentPage(clamped);
        setPageInput(String(clamped));
      } catch {
        if (!cancelled) setError("Couldn't render PDF preview");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Uniform-page-size assumption for placeholder sizing only (most documents
  // have consistent page dimensions) — actual render below still fetches
  // each page's real viewport, so mixed page sizes still render correctly,
  // they just briefly share a placeholder box before their turn to render.
  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;
    (async () => {
      const page = await pdfDoc.getPage(1);
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      setPageSize({ width: viewport.width, height: viewport.height });
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, scale]);

  useEffect(() => {
    renderedPagesRef.current = new Set();
    renderingPagesRef.current = new Set();
  }, [pdfDoc, scale]);

  // Non-continuous (single-page) mode: unchanged, render just the one page.
  useEffect(() => {
    if (!pdfDoc || continuous) return;
    let cancelled = false;
    (async () => {
      try {
        const canvas = canvasRefs.current[0];
        const pageToRender = Math.min(currentPage, clampedTotal);
        if (canvas && !cancelled) await renderPageToCanvas(pdfDoc, pageToRender, canvas, scale);
        if (!cancelled) setError(null);
      } catch {
        if (!cancelled) setError("Couldn't render PDF preview");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, scale, currentPage, continuous, clampedTotal]);

  // Continuous mode: render only the pages the IntersectionObserver below
  // has marked visible (± RENDER_BUFFER), never the whole document.
  //
  // visiblePageRange can update several times in quick succession right
  // after mount (the observer's first batch of callbacks), which re-runs
  // this effect before an earlier invocation's page.render() calls have
  // finished — a new invocation would then start rendering the SAME page
  // into the SAME canvas a still-in-flight call hasn't finished with yet.
  // pdf.js rejects that outright ("Cannot use the same canvas during
  // multiple render() operations"). renderingPagesRef tracks in-flight
  // pages (as opposed to renderedPagesRef, which only tracks completed
  // ones) so a concurrent invocation skips a page someone else is already
  // rendering instead of colliding with it.
  useEffect(() => {
    if (!pdfDoc || !continuous) return;
    let cancelled = false;
    const from = Math.max(1, visiblePageRange.min - RENDER_BUFFER);
    const to = Math.min(clampedTotal, visiblePageRange.max + RENDER_BUFFER);
    (async () => {
      try {
        for (let p = from; p <= to; p++) {
          if (cancelled) return;
          if (renderedPagesRef.current.has(p) || renderingPagesRef.current.has(p)) continue;
          const canvas = canvasRefs.current[p - 1];
          if (!canvas) continue;
          renderingPagesRef.current.add(p);
          try {
            await renderPageToCanvas(pdfDoc, p, canvas, scale);
            renderedPagesRef.current.add(p);
          } finally {
            renderingPagesRef.current.delete(p);
          }
        }
        if (!cancelled) setError(null);
      } catch {
        if (!cancelled) setError("Couldn't render PDF preview");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, scale, continuous, clampedTotal, visiblePageRange]);

  // Tracks which page slots are actually scrolled into view so the effect
  // above only rasterizes those — the mechanism that keeps a 15,000-page
  // document from trying to render 15,000 canvases at once.
  useEffect(() => {
    if (!continuous || !viewportRef.current) return;
    const root = viewportRef.current;
    const visible = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageNum = Number((entry.target as HTMLElement).dataset.page);
          if (!pageNum) continue;
          if (entry.isIntersecting) visible.add(pageNum);
          else visible.delete(pageNum);
        }
        if (visible.size === 0) return;
        setVisiblePageRange({ min: Math.min(...visible), max: Math.max(...visible) });
      },
      { root, rootMargin: "200px 0px" }
    );
    for (const el of pageWrapperRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [continuous, clampedTotal]);

  useEffect(() => {
    if (!syncTargetLine || !pdfDoc) return;
    const target = syncTargetLine;
    const doc = pdfDoc;
    let cancelled = false;

    async function resolveTarget(): Promise<{ page: number; y: number } | null> {
      // Real SyncTeX for a real local/cloud compile — a live query against
      // the actual .synctex.gz the compiler produced, not a fabricated
      // approximation. Falls through to the mock's precomputed array (the
      // only kind of "synctex" a mock/legacy-project compile has).
      const { compile: currentCompile, lastCompileMainFile, files } = useWorkspaceStore.getState();
      const sourcePath = files.find((f) => f.id === target.fileId)?.path.replace(/^\//, "");
      if (currentCompile && lastCompileMainFile && sourcePath) {
        const result = await synctexForward(currentCompile, lastCompileMainFile, sourcePath, target.line);
        if (result) {
          const page = await doc.getPage(result.page).catch(() => null);
          if (page) {
            const height = page.view[3] - page.view[1];
            if (height > 0) return { page: result.page, y: Math.min(1, Math.max(0, result.y / height)) };
          }
        }
      }

      const matches = synctex.filter((m) => m.fileId === target.fileId);
      if (matches.length === 0) return null;
      let nearest = matches[0];
      let bestDist = Math.abs(matches[0].line - target.line);
      for (const m of matches) {
        const dist = Math.abs(m.line - target.line);
        if (dist < bestDist) {
          bestDist = dist;
          nearest = m;
        }
      }
      return { page: nearest.page, y: nearest.y };
    }

    resolveTarget().then((resolved) => {
      if (cancelled || !resolved) return;
      if (!continuous && resolved.page !== currentPage) goToPage(resolved.page);
      setSyncMarkerY(resolved.y);
      setTimeout(() => {
        if (!cancelled) setSyncMarkerY(null);
      }, 2000);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncTargetLine, pdfDoc]);

  useEffect(() => {
    if (syncMarkerY == null || !viewportRef.current) return;
    const canvas = canvasRefs.current[continuous ? currentPage - 1 : 0];
    if (!canvas) return;
    const targetTop = canvas.offsetTop + syncMarkerY * canvas.height - viewportRef.current.clientHeight / 2;
    viewportRef.current.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncMarkerY]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function goToPage(page: number) {
    const clamped = Math.max(1, Math.min(clampedTotal, page));
    setCurrentPage(clamped);
    setPageInput(String(clamped));
  }

  async function fitToWidth() {
    if (!pdfDoc || !viewportRef.current) return;
    const page = await pdfDoc.getPage(Math.min(currentPage, clampedTotal));
    const natural = page.getViewport({ scale: 1 });
    const available = viewportRef.current.clientWidth - 32;
    setScale(Math.max(0.3, Math.min(4, available / natural.width)));
  }

  async function fitToPage() {
    if (!pdfDoc || !viewportRef.current) return;
    const page = await pdfDoc.getPage(Math.min(currentPage, clampedTotal));
    const natural = page.getViewport({ scale: 1 });
    const availableW = viewportRef.current.clientWidth - 32;
    const availableH = viewportRef.current.clientHeight - 32;
    setScale(Math.max(0.3, Math.min(4, Math.min(availableW / natural.width, availableH / natural.height))));
  }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen().catch(() => toast.error("Fullscreen isn't available here"));
    }
  }

  function handlePrint() {
    if (!pdfUrl) return;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = pdfUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        toast.error("Couldn't open the print dialog");
      }
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 1000);
    };
  }

  async function runSearch() {
    if (!pdfDoc || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const results: { page: number; count: number }[] = [];
    const escaped = searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    // Full-text search is O(pages) no matter what — cheap per page (text
    // extraction, not rasterization) but still blocking on a huge document.
    // Cap it and say so, rather than freezing the tab for minutes.
    const SEARCH_PAGE_CAP = 2000;
    const searchTotal = Math.min(clampedTotal, SEARCH_PAGE_CAP);
    for (let p = 1; p <= searchTotal; p++) {
      const page = await pdfDoc.getPage(p);
      const content = await page.getTextContent();
      const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
      const matches = text.match(regex);
      if (matches?.length) results.push({ page: p, count: matches.length });
    }
    setSearchResults(results);
    setSearching(false);
    if (results.length === 0) toast.info(`No matches for "${searchQuery.trim()}"`);
    else if (clampedTotal > SEARCH_PAGE_CAP) {
      toast.info(`Search covered the first ${SEARCH_PAGE_CAP} pages of ${clampedTotal}`);
    }
  }

  async function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>, pageNumber: number) {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const xFraction = (e.clientX - rect.left) / rect.width;
    const yFraction = (e.clientY - rect.top) / rect.height;

    async function jumpTo(fileId: string, line: number) {
      const { openFile } = useWorkspaceStore.getState();
      await openFile(fileId);
      setTimeout(() => {
        useWorkspaceStore.getState().editorHandle?.scrollToLine(line);
      }, 60);
    }

    // Real inverse search for a real local/cloud compile.
    if (pdfDoc) {
      const { compile: currentCompile, lastCompileMainFile, files } = useWorkspaceStore.getState();
      if (currentCompile && lastCompileMainFile) {
        const page = await pdfDoc.getPage(pageNumber).catch(() => null);
        if (page) {
          const width = page.view[2] - page.view[0];
          const height = page.view[3] - page.view[1];
          if (width > 0 && height > 0) {
            const result = await synctexInverse(
              currentCompile,
              lastCompileMainFile,
              pageNumber,
              xFraction * width,
              yFraction * height
            );
            if (result) {
              const normalizedPath = result.file.replace(/^\.?\//, "");
              const match = files.find((f) => f.path.replace(/^\//, "") === normalizedPath);
              if (match) {
                await jumpTo(match.id, result.line);
                return;
              }
            }
          }
        }
      }
    }

    const candidates = synctex.filter((m) => m.page === pageNumber);
    if (candidates.length === 0) {
      toast.info("No SyncTeX mapping for this spot");
      return;
    }
    let nearest = candidates[0];
    let bestDist = Math.abs(candidates[0].y - yFraction);
    for (const m of candidates) {
      const dist = Math.abs(m.y - yFraction);
      if (dist < bestDist) {
        bestDist = dist;
        nearest = m;
      }
    }
    await jumpTo(nearest.fileId, nearest.line);
  }

  function handleMarkerClick(entry: CompileLogEntry) {
    focusEntry(entry.id, entry.severity === "error" || entry.severity === "warning" ? entry.severity : "all");
    setActiveSidePanel("log");
  }

  const markers = (compile?.log ?? [])
    .filter((entry) => entry.severity === "error" || entry.severity === "warning")
    .map((entry) => ({ entry, y: entryYFraction(entry, synctex) }));

  if (isCompiling) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <FileTextIcon className="size-8 animate-pulse" />
        <p className="text-sm">Compiling…</p>
      </div>
    );
  }

  if (!pdfUrl) {
    const message =
      compile?.status === "timeout"
        ? "Last compile timed out — no PDF produced"
        : compile?.status === "stopped"
          ? "Compile was stopped before finishing"
          : "Compile to see your PDF preview";
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <FileTextIcon className="size-8" />
        <p className="text-sm">{message}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex h-full flex-col bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={clampedTotal <= 1}
            onClick={() => goToPage(currentPage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="size-3.5" />
          </Button>
          <Input
            value={pageInput}
            disabled={clampedTotal <= 1}
            onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={() => goToPage(Number(pageInput) || 1)}
            onKeyDown={(e) => {
              if (e.key === "Enter") goToPage(Number(pageInput) || 1);
            }}
            className="h-6 w-10 px-1 text-center text-xs"
          />
          <span className="text-xs text-muted-foreground">/ {clampedTotal}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={clampedTotal <= 1}
            onClick={() => goToPage(currentPage + 1)}
            aria-label="Next page"
          >
            <ChevronRightIcon className="size-3.5" />
          </Button>
        </div>

        <div className="mx-1 h-4 w-px bg-border" />

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => setScale((s) => Math.max(0.3, s - 0.15))}
            aria-label="Zoom out"
          >
            <MinusIcon className="size-3.5" />
          </Button>
          <span className="w-10 text-center text-xs tabular-nums">{Math.round(scale * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => setScale((s) => Math.min(4, s + 0.15))}
            aria-label="Zoom in"
          >
            <PlusIcon className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]" onClick={fitToWidth}>
            Fit width
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]" onClick={fitToPage}>
            Fit page
          </Button>
        </div>

        <div className="mx-1 h-4 w-px bg-border" />

        <Button
          variant={continuous ? "secondary" : "ghost"}
          size="icon"
          className="size-6"
          onClick={() => setContinuous((c) => !c)}
          aria-label="Toggle continuous scroll"
          title={continuous ? "Switch to single page" : "Switch to continuous scroll"}
        >
          {continuous ? <LayoutListIcon className="size-3.5" /> : <SquareIcon className="size-3.5" />}
        </Button>

        <Button
          variant={searchOpen ? "secondary" : "ghost"}
          size="icon"
          className="size-6"
          onClick={() => setSearchOpen((s) => !s)}
          aria-label="Search in PDF"
        >
          <SearchIcon className="size-3.5" />
        </Button>

        <div className="ml-auto flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="size-6" onClick={handlePrint} aria-label="Print PDF">
            <PrinterIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            nativeButton={false}
            render={<a href={pdfUrl} download="compiled.pdf" aria-label="Download PDF" />}
          >
            <DownloadIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <MinimizeIcon className="size-3.5" /> : <MaximizeIcon className="size-3.5" />}
          </Button>
        </div>
      </div>

      {searchOpen && (
        <div className="flex flex-col gap-1.5 border-b px-2 py-1.5">
          <div className="flex items-center gap-1">
            <SearchIcon className="size-3.5 text-muted-foreground" />
            <Input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runSearch();
              }}
              placeholder="Search compiled PDF text…"
              className="h-6 flex-1 text-xs"
            />
            <Button size="sm" variant="secondary" className="h-6 px-2 text-xs" disabled={searching} onClick={() => void runSearch()}>
              {searching ? "Searching…" : "Search"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => {
                setSearchOpen(false);
                setSearchResults([]);
                setSearchQuery("");
              }}
              aria-label="Close search"
            >
              <XIcon className="size-3.5" />
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {searchResults.map((r) => (
                <Button
                  key={r.page}
                  size="sm"
                  variant="outline"
                  className="h-6 gap-1 px-1.5 text-[11px]"
                  onClick={() => goToPage(r.page)}
                >
                  <ScanIcon className="size-3" />
                  Page {r.page} · {r.count} match{r.count === 1 ? "" : "es"}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      <div ref={viewportRef} className="flex-1 overflow-auto bg-muted/40 p-4">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div className="mx-auto flex w-fit items-start gap-3">
            {continuous ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: clampedTotal }).map((_, i) => {
                  const pageNum = i + 1;
                  const rendered = renderedPagesRef.current.has(pageNum);
                  return (
                    <div
                      key={i}
                      data-page={pageNum}
                      ref={(el) => {
                        pageWrapperRefs.current[i] = el;
                      }}
                      style={
                        !rendered && pageSize
                          ? { width: pageSize.width, height: pageSize.height }
                          : undefined
                      }
                      className="shrink-0 bg-background shadow-md"
                    >
                      <canvas
                        ref={(el) => {
                          canvasRefs.current[i] = el;
                        }}
                        onClick={(e) => handleCanvasClick(e, pageNum)}
                        className="block cursor-crosshair"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="relative shadow-md">
                <canvas
                  ref={(el) => {
                    canvasRefs.current[0] = el;
                  }}
                  onClick={(e) => handleCanvasClick(e, Math.min(currentPage, clampedTotal))}
                  className="block cursor-crosshair"
                />
                {syncMarkerY != null && (
                  <div
                    style={{ top: `${syncMarkerY * 100}%` }}
                    className="pointer-events-none absolute inset-x-0 h-8 -translate-y-1/2 animate-pulse bg-primary/20 ring-2 ring-primary/60"
                  />
                )}
                {markers.length > 0 && Math.min(currentPage, clampedTotal) === 1 && (
                  <div className="absolute top-0 -right-4 h-full w-3">
                    {markers.map(({ entry, y }) => {
                      const Icon = entry.severity === "error" ? AlertCircleIcon : AlertTriangleIcon;
                      return (
                        <button
                          key={entry.id}
                          title={entry.message}
                          onClick={() => handleMarkerClick(entry)}
                          style={{ top: `${y * 100}%` }}
                          className={cn(
                            "absolute left-0 flex size-3 -translate-y-1/2 items-center justify-center rounded-full text-white shadow",
                            entry.severity === "error" ? "bg-destructive" : "bg-amber-500"
                          )}
                        >
                          <Icon className="size-2" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
