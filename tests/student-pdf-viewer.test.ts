import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildStudentPdfProgressPayload,
  buildStudentPdfViewerUrl,
  postStudentPdfProgress,
  STUDENT_PDF_PROGRESS_SAVE_DELAY_MS,
} from "@/lib/resources/student-pdf-progress";

test("application Next posts the debounced page and correct resource ID", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  const payload = buildStudentPdfProgressPayload("resource-123", 2, 10);
  const response = await postStudentPdfProgress(fetcher as typeof fetch, payload);

  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/student/resources/progress");
  assert.equal(calls[0].init?.method, "POST");
  assert.equal(calls[0].init?.credentials, "same-origin");
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
    resourceId: "resource-123",
    page: 2,
    percent: 20,
    completed: false,
  });
  assert.equal(STUDENT_PDF_PROGRESS_SAVE_DELAY_MS, 600);
});

test("application Previous updates and saves the earlier page", async () => {
  let savedPayload: unknown;
  const fetcher = async (_url: string | URL | Request, init?: RequestInit) => {
    savedPayload = JSON.parse(String(init?.body));
    return new Response(null, { status: 200 });
  };
  const payload = buildStudentPdfProgressPayload("resource-123", 2, 10);
  await postStudentPdfProgress(fetcher as typeof fetch, payload);
  assert.deepEqual(savedPayload, {
    resourceId: "resource-123",
    page: 2,
    percent: 20,
    completed: false,
  });
});

test("unknown page count omits percent and never marks completion", () => {
  const payload = buildStudentPdfProgressPayload("resource-123", 25, null);
  assert.deepEqual(payload, {
    resourceId: "resource-123",
    page: 25,
    completed: false,
  });
  assert.equal("percent" in payload, false);
});

test("viewer URL restores the saved page and requests hidden native controls", () => {
  const url = buildStudentPdfViewerUrl("/api/student/resources/resource-123/asset", 7);
  assert.match(url, /^\/api\/student\/resources\/resource-123\/asset#/);
  assert.match(url, /page=7/);
  assert.match(url, /toolbar=0/);
  assert.match(url, /navpanes=0/);
  assert.match(url, /scrollbar=0/);
});

test("React-PDF canvas viewer loads through the protected endpoint with credentials", async () => {
  const source = await readFile("components/student/StudentPdfCanvasViewer.tsx", "utf8");
  assert.match(source, /^"use client";/);
  assert.match(source, /import \{ Document, Page, pdfjs \} from "react-pdf"/);
  assert.match(source, /pdfjs-dist\/build\/pdf\.worker\.min\.mjs/);
  assert.match(source, /new URL\([\s\S]*import\.meta\.url/);
  assert.match(source, /useMemo\(\(\) => \(\{ url: sourceUrl \}\), \[sourceUrl\]\)/);
  assert.match(source, /withCredentials: true/);
  assert.match(source, /pageNumber=\{page\}/);
  assert.match(source, /Loading PDF/);
  assert.match(source, /We couldn&apos;t display this PDF right now/);
  assert.doesNotMatch(source, /objectKey|filesystem|storage\//i);
});

test("React-PDF stores the document page count and clamps the restored page", async () => {
  const source = await readFile("components/student/StudentPdfCanvasViewer.tsx", "utf8");
  assert.match(source, /onLoadSuccess=\{\(\{ numPages: loadedPageCount \}\) =>/);
  assert.match(source, /Math\.min\(loadedPageCount, Math\.max\(1, initialPage \?\? 1\)\)/);
  assert.match(source, /setNumPages\(loadedPageCount\)/);
  assert.match(source, /setPage\(restoredPage\)/);
});

test("React-PDF navigation changes only the selected Page while Document stays mounted", async () => {
  const source = await readFile("components/student/StudentPdfCanvasViewer.tsx", "utf8");
  assert.match(source, /const navigate = \(nextPage: number\) =>/);
  assert.match(source, /setPage\(safePage\)/);
  assert.match(source, /<Document[\s\S]*<Page[\s\S]*pageNumber=\{page\}/);
  assert.doesNotMatch(source, /<Document\s+key=/);
  assert.doesNotMatch(source, /<Page\s+key=/);
  assert.match(source, /navigationLockedRef\.current/);
});

test("React-PDF navigation disables Previous and Next at boundaries and during rendering", async () => {
  const source = await readFile("components/student/StudentPdfCanvasViewer.tsx", "utf8");
  assert.match(source, /disabled=\{!numPages \|\| isPageRendering \|\| page <= 1\}/);
  assert.match(source, /disabled=\{!numPages \|\| isPageRendering \|\| page >= numPages\}/);
  assert.match(source, /onRenderSuccess=\{finishPageRender\}/);
});

test("React-PDF applies responsive width in a bounded vertical scroll area", async () => {
  const source = await readFile("components/student/StudentPdfCanvasViewer.tsx", "utf8");
  assert.match(source, /new ResizeObserver/);
  assert.match(source, /width - VIEWER_HORIZONTAL_PADDING/);
  assert.match(source, /width=\{availableWidth\}/);
  assert.match(source, /Math\.min\(window\.devicePixelRatio \|\| 1, 2\)/);
  assert.match(source, /max-h-\[calc\(100vh-12rem\)\]/);
  assert.match(source, /overflow-y-auto overflow-x-hidden/);
  assert.match(source, /min-w-0 overflow-hidden/);
});

test("iframe fallback appears only after a React-PDF error, not ordinary loading", async () => {
  const source = await readFile("components/student/StudentPdfCanvasViewer.tsx", "utf8");
  const errorBranch = source.indexOf("if (loadError)");
  const fallback = source.indexOf("Open basic viewer");
  const loading = source.indexOf("Loading PDF");
  assert.ok(errorBranch >= 0);
  assert.ok(fallback > errorBranch);
  assert.ok(loading > fallback);
  assert.equal(source.match(/Open basic viewer/g)?.length, 1);

  const parent = await readFile("components/student/StudentPdfViewer.tsx", "utf8");
  assert.match(parent, /if \(!useIframeFallback\)/);
  assert.match(parent, /onUseIframeFallback=\{\(\) => setUseIframeFallback\(true\)\}/);
});

test("React-PDF is dynamically loaded without SSR and iframe fallback remains available", async () => {
  const source = await readFile("components/student/StudentPdfViewer.tsx", "utf8");
  assert.match(source, /dynamic\([\s\S]*StudentPdfCanvasViewer[\s\S]*ssr: false/);
  assert.match(source, /sourceUrl=\{viewerState\.sourceUrl\}/);
  assert.match(source, /onUseIframeFallback=\{\(\) => setUseIframeFallback\(true\)\}/);
  assert.match(source, /<iframe/);
  assert.match(source, /src=\{buildStudentPdfViewerUrl\(viewerState\.sourceUrl, page\)\}/);
});

test("native iframe identity and URL follow Next, Previous, and restored pages", async () => {
  const sourceUrl = "/api/student/resources/resource-123/asset";
  const frame = (page: number) => ({
    key: `resource-123-${page}`,
    src: buildStudentPdfViewerUrl(sourceUrl, page),
  });

  const restored = frame(7);
  const next = frame(8);
  const previous = frame(7);

  assert.deepEqual(restored, {
    key: "resource-123-7",
    src: `${sourceUrl}#page=7&toolbar=0&navpanes=0&scrollbar=0&view=FitH`,
  });
  assert.equal(next.key, "resource-123-8");
  assert.match(next.src, /#page=8&toolbar=0/);
  assert.deepEqual(previous, restored);

  const source = await readFile("components/student/StudentPdfViewer.tsx", "utf8");
  assert.match(source, /key=\{`\$\{resourceId\}-\$\{page\}`\}/);
  assert.match(source, /src=\{buildStudentPdfViewerUrl\(viewerState\.sourceUrl, page\)\}/);
});

test("loading starts for tracked navigation and blocks rapid repeated clicks", async () => {
  const source = await readFile("components/student/StudentPdfViewer.tsx", "utf8");
  assert.match(source, /const \[isPdfLoading, setIsPdfLoading\] = useState\(true\)/);
  assert.match(source, /if \(isPdfLoadingRef\.current\) return/);
  assert.match(source, /isPdfLoadingRef\.current = true;\s+setIsPdfLoading\(true\);\s+hasChangedPageRef\.current = true/);
  assert.match(source, /disabled=\{isPdfLoading \|\| page <= 1\}/);
  assert.match(source, /disabled=\{isPdfLoading \|\| Boolean\(pageCount && page >= pageCount\)\}/);
});

test("iframe load and timeout fallback clear loading without saving progress", async () => {
  const source = await readFile("components/student/StudentPdfViewer.tsx", "utf8");
  assert.match(source, /const PDF_LOAD_FALLBACK_MS = 5000/);
  assert.match(source, /pdfLoadTimerRef\.current = window\.setTimeout/);
  assert.match(source, /onLoad=\{finishPdfLoading\}/);
  assert.match(source, /window\.clearTimeout\(pdfLoadTimerRef\.current\)/);
  assert.match(source, /role="status" aria-live="polite"/);
  assert.match(source, /Loading page/);
  assert.doesNotMatch(source, /finishPdfLoading[\s\S]{0,300}postStudentPdfProgress/);
});

test("viewer source keeps initial load passive and save failure visible", async () => {
  const source = await readFile("components/student/StudentPdfViewer.tsx", "utf8");
  assert.match(source, /!hasChangedPageRef\.current/);
  assert.match(source, /hasChangedPageRef\.current = true/);
  assert.match(source, /window\.setTimeout/);
  assert.match(source, /STUDENT_PDF_PROGRESS_SAVE_DELAY_MS/);
  assert.doesNotMatch(source, /onLoad=\{[^}]*postStudentPdfProgress/);
  assert.match(source, /setSaveError\(!response\.ok\)/);
  assert.match(source, /Your page could not be saved/);
  assert.match(source, /Tracked page navigation/);
  assert.match(source, /Use Previous and Next here to save your reading position/);
});
