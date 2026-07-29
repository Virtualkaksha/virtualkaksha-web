"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";

import type { ResourceViewerState } from "@/lib/resources/student-resource-service";

type StudentPdfViewerProps = {
  resourceId: string;
  viewerState: ResourceViewerState;
  initialPage?: number | null;
  pageCount?: number | null;
  onPageChange?: (page: number) => void;
};

export default function StudentPdfViewer({ resourceId, viewerState, initialPage = 1, pageCount, onPageChange }: StudentPdfViewerProps) {
  const [page, setPage] = useState(Math.max(1, initialPage ?? 1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const hasChangedPageRef = useRef(false);

  useEffect(() => {
    if (viewerState.viewerType !== "native" || !hasChangedPageRef.current) {
      return undefined;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void fetch("/api/student/resources/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId,
          page,
          percent: Math.round((page / Math.max(1, pageCount ?? page)) * 100),
          completed: Boolean(pageCount && page >= pageCount),
        }),
      }).then((response) => {
        setSaveError(!response.ok);
      }).catch(() => setSaveError(true));
    }, 600);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [page, pageCount, resourceId, viewerState.viewerType]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
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

  const handlePageChange = (nextPage: number) => {
    const safePage = Math.min(pageCount ?? Number.MAX_SAFE_INTEGER, Math.max(1, nextPage));
    if (safePage === page) return;
    hasChangedPageRef.current = true;
    setSaveError(false);
    setPage(safePage);
    onPageChange?.(safePage);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100"
            aria-label="Previous page"
            disabled={page <= 1}
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
            disabled={Boolean(pageCount && page >= pageCount)}
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

      <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 ${containerClassName}`}>
        {loading ? (
          <div className="flex h-full min-h-[420px] items-center justify-center text-sm font-medium text-slate-600">
            Loading PDF…
          </div>
        ) : null}
        {error ? (
          <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 text-center text-sm text-slate-600">
            <p className="font-semibold text-slate-900">We couldn’t display this PDF right now.</p>
            <p className="mt-2">Please try again in a moment.</p>
          </div>
        ) : null}
        <iframe
          src={`${viewerState.sourceUrl}#page=${page}`}
          title={resourceId}
          className={`h-full min-h-[420px] w-full border-0 ${loading ? "hidden" : "block"}`}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError("Unable to load PDF.");
          }}
        />
      </div>
      {saveError ? (
        <p role="status" className="text-xs text-amber-700">
          Your page could not be saved. You can keep reading and try another page.
        </p>
      ) : null}
    </div>
  );
}
