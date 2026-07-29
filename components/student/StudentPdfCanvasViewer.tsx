"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

const VIEWER_HORIZONTAL_PADDING = 32;

export default function StudentPdfCanvasViewer({
  sourceUrl,
  initialPage = 1,
  onPageChange,
  onUseIframeFallback,
}: StudentPdfCanvasViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const navigationLockedRef = useRef(true);
  const [availableWidth, setAvailableWidth] = useState<number>();
  const [devicePixelRatio] = useState(() =>
    typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2),
  );
  const [numPages, setNumPages] = useState<number>();
  const [page, setPage] = useState(Math.max(1, initialPage ?? 1));
  const [isPageRendering, setIsPageRendering] = useState(true);
  const [loadError, setLoadError] = useState<"document" | "page" | null>(null);
  const file = useMemo(() => ({ url: sourceUrl }), [sourceUrl]);
  const options = useMemo(() => ({ withCredentials: true }), []);

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
  }, []);

  const finishPageRender = useCallback(() => {
    navigationLockedRef.current = false;
    setIsPageRendering(false);
  }, []);

  const navigate = (nextPage: number) => {
    if (!numPages || navigationLockedRef.current) return;
    const safePage = Math.min(numPages, Math.max(1, nextPage));
    if (safePage === page) return;

    navigationLockedRef.current = true;
    setIsPageRendering(true);
    setLoadError(null);
    setPage(safePage);
    onPageChange?.(safePage, numPages);
  };

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

  return (
    <div ref={viewerRef} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
      <div className="sticky top-0 z-20 flex min-h-16 items-center justify-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={() => navigate(page - 1)}
          disabled={!numPages || isPageRendering || page <= 1}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="relative max-h-[calc(100vh-12rem)] min-h-[420px] overflow-y-auto overflow-x-hidden p-4">
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
            navigationLockedRef.current = true;
            setIsPageRendering(true);
          }}
          onLoadError={() => setLoadError("document")}
        >
          {numPages && availableWidth ? (
            <div className="relative mx-auto w-fit max-w-full shadow-sm">
              {isPageRendering ? (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-100/60">
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
