export const STUDENT_PDF_PROGRESS_SAVE_DELAY_MS = 600;

export type StudentPdfProgressPayload = {
  resourceId: string;
  page: number;
  percent?: number;
  completed: boolean;
};

export function buildStudentPdfProgressPayload(
  resourceId: string,
  page: number,
  pageCount?: number | null,
): StudentPdfProgressPayload {
  const payload: StudentPdfProgressPayload = {
    resourceId,
    page,
    completed: Boolean(pageCount && page >= pageCount),
  };

  if (pageCount) {
    payload.percent = Math.round((page / pageCount) * 100);
  }

  return payload;
}

export function buildStudentPdfViewerUrl(sourceUrl: string, page: number) {
  const baseUrl = sourceUrl.split("#", 1)[0];
  const fragment = new URLSearchParams({
    page: String(page),
    toolbar: "0",
    navpanes: "0",
    scrollbar: "0",
    view: "FitH",
  });
  return `${baseUrl}#${fragment.toString()}`;
}

export async function postStudentPdfProgress(
  fetcher: typeof fetch,
  payload: StudentPdfProgressPayload,
) {
  return fetcher("/api/student/resources/progress", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getStudentPdfProgressRetryAfterMs(response: Response, now = Date.now()) {
  if (response.status !== 429) return 0;
  const value = response.headers.get("retry-after")?.trim();
  if (!value) return 1_000;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(86_400_000, Math.max(1_000, Math.ceil(seconds * 1_000)));
  }
  const resetAt = Date.parse(value);
  return Number.isFinite(resetAt)
    ? Math.min(86_400_000, Math.max(1_000, resetAt - now))
    : 1_000;
}
