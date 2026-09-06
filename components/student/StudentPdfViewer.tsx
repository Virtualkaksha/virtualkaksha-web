"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";

import type { ResourceViewerState } from "@/lib/resources/student-resource-service";
import {
  buildStudentPdfProgressPayload,
  buildStudentPdfViewerUrl,
  getStudentPdfProgressRetryAfterMs,
  postStudentPdfProgress,
  STUDENT_PDF_PROGRESS_SAVE_DELAY_MS,
} from "@/lib/resources/student-pdf-progress";

const StudentPdfCanvasViewer = dynamic(
  () => import("@/components/student/StudentPdfCanvasViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-100">
        <p role="status" className="text-sm font-medium text-slate-600">Loading secure PDF viewer…</p>
      </div>
    ),
  },
);

type StudentPdfViewerProps = {
  resourceId: string;
  viewerState: ResourceViewerState;
  initialPage?: number | null;
  pageCount?: number | null;
  onPageChange?: (page: number) => void;
  /** When false (guests), skip progress POSTs so 401s do not surface as save errors. */
  enableProgressTracking?: boolean;
};

const PDF_LOAD_FALLBACK_MS = 5000;

export default function StudentPdfViewer({ resourceId, viewerState, initialPage = 1, pageCount, onPageChange, enableProgressTracking = true }: StudentPdfViewerProps) {
  const [page, setPage] = useState(Math.max(1, initialPage ?? 1));
  const [resolvedPageCount, setResolvedPageCount] = useState(pageCount);
  const [isPdfLoading, setIsPdfLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saveRateLimited, setSaveRateLimited] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const pdfLoadTimerRef = useRef<number | null>(null);
  const isPdfLoadingRef = useRef(true);
  const hasChangedPageRef = useRef(false);
  const progressWriteBlockedUntilRef = useRef(0);

  useEffect(() => {
    if (!enableProgressTracking || viewerState.viewerType !== "native" || !hasChangedPageRef.current) {
      return undefined;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    if (Date.now() < progressWriteBlockedUntilRef.current) {
      setSaveRateLimited(true);
      return undefined;
    }
    setSaveRateLimited(false);

    saveTimerRef.current = window.setTimeout(() => {
      const payload = buildStudentPdfProgressPayload(resourceId, page, resolvedPageCount);
      void postStudentPdfProgress(fetch, payload).then((response) => {
        const retryAfterMs = getStudentPdfProgressRetryAfterMs(response);
        if (retryAfterMs > 0) {
          progressWriteBlockedUntilRef.current = Date.now() + retryAfterMs;
          setSaveRateLimited(true);
          setSaveError(false);
          return;
        }
        setSaveRateLimited(false);
        setSaveError(!response.ok);
      }).catch(() => setSaveError(true));
    }, STUDENT_PDF_PROGRESS_SAVE_DELAY_MS);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [enableProgressTracking, page, resolvedPageCount, resourceId, viewerState.viewerType]);

  useEffect(() => {
    if (!isPdfLoading) return undefined;

    if (pdfLoadTimerRef.current) {
      window.clearTimeout(pdfLoadTimerRef.current);
    }
    pdfLoadTimerRef.current = window.setTimeout(() => {
      pdfLoadTimerRef.current = null;
      isPdfLoadingRef.current = false;
      setIsPdfLoading(false);
    }, PDF_LOAD_FALLBACK_MS);

    return () => {
      if (pdfLoadTimerRef.current) {
        window.clearTimeout(pdfLoadTimerRef.current);
        pdfLoadTimerRef.current = null;
      }
    };
  }, [isPdfLoading, page]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      if (pdfLoadTimerRef.current) {
        window.clearTimeout(pdfLoadTimerRef.current);
      }
    };
  }, []);

  const containerClassName = useMemo(() => (expanded ? "min-h-[80vh]" : "min-h-[60vh]"), [expanded]);

  if (viewerState.viewerType !== "native") {
    if (!viewerState.sourceUrl) {
      return null;
    }

    return (
      <div className="space-y-4">
        <iframe
          src={viewerState.sourceUrl}
          title="Resource preview"
          className="h-[72vh] min-h-[560px] w-full rounded-2xl border border-slate-200 bg-white"
        />
      </div>
    );
  }

  if (!useIframeFallback) {
    return (
      <div className="space-y-4">
        <StudentPdfCanvasViewer
          sourceUrl={viewerState.sourceUrl}
          initialPage={initialPage}
          onPageChange={(nextPage, loadedPageCount) => {
            hasChangedPageRef.current = true;
            setSaveError(false);
            setResolvedPageCount(loadedPageCount);
            setPage(nextPage);
            onPageChange?.(nextPage);
          }}
          onUseIframeFallback={() => setUseIframeFallback(true)}
        />
        {saveError ? (
          <p role="status" className="text-xs text-amber-700">
            Your page could not be saved. You can keep reading and try another page.
          </p>
        ) : null}
        {saveRateLimited ? (
          <p role="status" className="text-xs text-slate-500">Reading position will resume saving shortly.</p>
        ) : null}
      </div>
    );
  }

  const handlePageChange = (nextPage: number) => {
    if (isPdfLoadingRef.current) return;
    const safePage = Math.min(pageCount ?? Number.MAX_SAFE_INTEGER, Math.max(1, nextPage));
    if (safePage === page) return;
    isPdfLoadingRef.current = true;
    setIsPdfLoading(true);
    hasChangedPageRef.current = true;
    setSaveError(false);
    setError(null);
    setPage(safePage);
    onPageChange?.(safePage);
  };

  const finishPdfLoading = () => {
    if (pdfLoadTimerRef.current) {
      window.clearTimeout(pdfLoadTimerRef.current);
      pdfLoadTimerRef.current = null;
    }
    isPdfLoadingRef.current = false;
    setIsPdfLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Tracked page navigation</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Use Previous and Next here to save your reading position.
          </p>
        </div>
        <div className="flex items-center gap-2" aria-label="Tracked PDF page navigation">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100"
            aria-label="Previous page"
            disabled={isPdfLoading || page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-20 rounded-full bg-white px-3 py-1 text-center text-sm font-semibold text-slate-700">
            Page {page}{pageCount ? ` / ${pageCount}` : ""}
          </span>
          <button
            type="button"
            onClick={() => handlePageChange(page + 1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100"
            aria-label="Next page"
            disabled={isPdfLoading || Boolean(pageCount && page >= pageCount)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100"
            aria-label="Toggle expanded viewer"
          >
            <ChevronsUpDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 ${containerClassName}`}>
        {isPdfLoading ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex min-h-[420px] items-center justify-center bg-slate-100/60">
            <p role="status" aria-live="polite" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              Loading page…
            </p>
          </div>
        ) : null}
        {error ? (
          <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 text-center text-sm text-slate-600">
            <p className="font-semibold text-slate-900">We couldn’t display this PDF right now.</p>
            <p className="mt-2">Please try again in a moment.</p>
          </div>
        ) : null}
        <iframe
          key={`${resourceId}-${page}`}
          src={buildStudentPdfViewerUrl(viewerState.sourceUrl, page)}
          title={resourceId}
          className="block h-full min-h-[420px] w-full border-0"
          onLoad={finishPdfLoading}
          onError={() => {
            finishPdfLoading();
            setError("Unable to load PDF.");
          }}
        />
      </div>
      {saveError ? (
        <p role="status" className="text-xs text-amber-700">
          Your page could not be saved. You can keep reading and try another page.
        </p>
      ) : null}
      {saveRateLimited ? (
        <p role="status" className="text-xs text-slate-500">Reading position will resume saving shortly.</p>
      ) : null}
    </div>
  );
}
