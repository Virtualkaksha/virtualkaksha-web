"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type StudentPdfCanvasViewerProps = {
  sourceUrl: string;
  initialPage?: number | null;
  onPageChange?: (page: number, pageCount: number) => void;
  onUseIframeFallback?: () => void;
};

type TurnDirection = "next" | "previous" | "none";
type FullscreenMode = "off" | "native" | "css";

const VIEWER_HORIZONTAL_PADDING = 32;

export default function StudentPdfCanvasViewer({
  sourceUrl,
  initialPage = 1,
  onPageChange,
  onUseIframeFallback,
}: StudentPdfCanvasViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigationLockedRef = useRef(true);
  const pageRef = useRef(Math.max(1, initialPage ?? 1));
  const numPagesRef = useRef<number | undefined>(undefined);
  const [availableWidth, setAvailableWidth] = useState<number>();
  const [devicePixelRatio] = useState(() =>
    typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2),
  );
  const [numPages, setNumPages] = useState<number>();
  const [page, setPage] = useState(Math.max(1, initialPage ?? 1));
  const [isPageRendering, setIsPageRendering] = useState(true);
  const [turnDirection, setTurnDirection] = useState<TurnDirection>("none");
  const [loadError, setLoadError] = useState<"document" | "page" | null>(null);
  const [fullscreenMode, setFullscreenMode] = useState<FullscreenMode>("off");
  const file = useMemo(() => ({ url: sourceUrl }), [sourceUrl]);
  const options = useMemo(() => ({ withCredentials: true }), []);
  const isFullscreen = fullscreenMode !== "off";

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    numPagesRef.current = numPages;
  }, [numPages]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return undefined;

    const updateWidth = (width: number) => {
      setAvailableWidth(Math.max(1, Math.floor(width - VIEWER_HORIZONTAL_PADDING)));
    };
    updateWidth(viewer.getBoundingClientRect().width);

    const observer = new ResizeObserver(([entry]) => {
      if (entry) updateWidth(entry.contentRect.width);
    });
    observer.observe(viewer);
    return () => observer.disconnect();
  }, [fullscreenMode]);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // The CSS overlay still needs to close even if the browser rejects exitFullscreen.
      }
    }
    setFullscreenMode("off");
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (fullscreenMode !== "off") {
      await exitFullscreen();
      return;
    }

    try {
      if (typeof viewer.requestFullscreen === "function") {
        await viewer.requestFullscreen();
        setFullscreenMode("native");
        return;
      }
    } catch {
      // iOS Safari and some embedded browsers reject the Fullscreen API.
    }

    setFullscreenMode("css");
  }, [exitFullscreen, fullscreenMode]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (document.fullscreenElement === viewerRef.current) {
        setFullscreenMode("native");
        return;
      }
      setFullscreenMode((mode) => (mode === "native" ? "off" : mode));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (fullscreenMode !== "css") return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setFullscreenMode("off");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreenMode]);

  const finishPageRender = useCallback(() => {
    navigationLockedRef.current = false;
    setIsPageRendering(false);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const navigate = (nextPage: number) => {
    const currentPage = pageRef.current;
    const pageCount = numPagesRef.current;
    if (!pageCount || navigationLockedRef.current) return;
    const safePage = Math.min(pageCount, Math.max(1, nextPage));
    if (safePage === currentPage) return;

    navigationLockedRef.current = true;
    setIsPageRendering(true);
    setLoadError(null);
    setTurnDirection(safePage > currentPage ? "next" : "previous");
    setPage(safePage);
    onPageChange?.(safePage, pageCount);
  };

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return undefined;

    const onWheel = (event: WheelEvent) => {
      if (navigationLockedRef.current || !numPagesRef.current) return;
      const atTop = scroller.scrollTop <= 1;
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
      if (event.deltaY > 24 && atBottom && pageRef.current < numPagesRef.current) {
        event.preventDefault();
        navigate(pageRef.current + 1);
      } else if (event.deltaY < -24 && atTop && pageRef.current > 1) {
        event.preventDefault();
        navigate(pageRef.current - 1);
      }
    };

    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", onWheel);
  });

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        navigate(pageRef.current + 1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        navigate(pageRef.current - 1);
      }
    };

    viewer.addEventListener("keydown", onKeyDown);
    return () => viewer.removeEventListener("keydown", onKeyDown);
  });

  if (loadError) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-6 text-center">
        <p className="font-semibold text-slate-900">We couldn&apos;t display this PDF right now.</p>
        <p className="mt-2 text-sm text-slate-600">
          {loadError === "document" ? "The secure PDF could not be loaded." : "This PDF page could not be rendered."}
        </p>
        {onUseIframeFallback ? (
          <button
            type="button"
            onClick={onUseIframeFallback}
            className="mt-5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Open basic viewer
          </button>
        ) : null}
      </div>
    );
  }

  const pageMotionClass =
    turnDirection === "next" ? "pdf-page-enter-next" : turnDirection === "previous" ? "pdf-page-enter-previous" : "pdf-page-enter";

  return (
    <div
      ref={viewerRef}
      tabIndex={0}
      className={`min-w-0 overflow-hidden bg-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-blue-200 ${
        isFullscreen
          ? "flex h-full min-h-full flex-col rounded-none"
          : "rounded-2xl border border-slate-200"
      } ${fullscreenMode === "css" ? "fixed inset-0 z-[80] h-dvh w-dvw" : ""}`}
    >
      <div className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(page - 1)}
            disabled={!numPages || isPageRendering || page <= 1}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <span className="min-w-28 text-center text-sm font-semibold text-slate-700">
            Page {page} of {numPages ?? "—"}
          </span>
          <button
            type="button"
            onClick={() => navigate(page + 1)}
            disabled={!numPages || isPageRendering || page >= numPages}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          aria-label={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          <span className="hidden sm:inline">{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</span>
        </button>
      </div>

      <div
        ref={scrollRef}
        className={`pdf-scroller relative overflow-y-auto overflow-x-hidden p-4 ${
          isFullscreen ? "min-h-0 flex-1" : "max-h-[calc(100vh-12rem)] min-h-[420px]"
        }`}
      >
        <Document
          file={file}
          options={options}
          loading={
            <div className="flex min-h-[420px] items-center justify-center">
              <p role="status" className="text-sm font-medium text-slate-600">Loading PDF…</p>
            </div>
          }
          onLoadSuccess={({ numPages: loadedPageCount }) => {
            const restoredPage = Math.min(loadedPageCount, Math.max(1, initialPage ?? 1));
            setNumPages(loadedPageCount);
            setPage(restoredPage);
            setTurnDirection("none");
            navigationLockedRef.current = true;
            setIsPageRendering(true);
          }}
          onLoadError={() => setLoadError("document")}
        >
          {numPages && availableWidth ? (
            <div className={`relative mx-auto w-fit max-w-full shadow-sm ${pageMotionClass}`}>
              {isPageRendering ? (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-100/60 transition-opacity duration-200">
                  <p role="status" aria-live="polite" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    Rendering page…
                  </p>
                </div>
              ) : null}
              <Page
                pageNumber={page}
                width={availableWidth}
                devicePixelRatio={devicePixelRatio}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                onRenderSuccess={finishPageRender}
                onRenderError={() => setLoadError("page")}
              />
            </div>
          ) : null}
        </Document>
      </div>
    </div>
  );
}
