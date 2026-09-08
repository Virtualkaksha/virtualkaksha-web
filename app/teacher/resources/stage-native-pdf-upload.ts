import type { TeacherResourceActionResult } from "./actions";

type FetchLike = typeof fetch;
type FailedTeacherResourceResult = Extract<TeacherResourceActionResult, { ok: false }>;

export type StageNativePdfResult =
  | { ok: true; formData: FormData }
  | FailedTeacherResourceResult;

export type TeacherUploadUrlResponse =
  | { ok: true; mode: "buffered" }
  | {
      ok: true;
      mode: "presigned";
      url: string;
      objectKey: string;
      requiredContentType: string;
      expiresInSeconds: number;
      maxBytes: number;
    }
  | { ok: false; message?: string; error?: string };

function failure(
  code: string,
  message: string,
  retryable: boolean,
  retryAfterSeconds?: number,
): FailedTeacherResourceResult {
  return retryAfterSeconds
    ? { ok: false, code, message, retryable, retryAfterSeconds }
    : { ok: false, code, message, retryable };
}

function rateLimitedResult(response: Response): FailedTeacherResourceResult {
  const retryAfter = Math.max(1, Number.parseInt(response.headers.get("retry-after") ?? "1", 10) || 1);
  return failure(
    "RATE_LIMITED",
    `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
    true,
    retryAfter,
  );
}

async function readUploadUrl(response: Response): Promise<TeacherUploadUrlResponse | null> {
  return response.json().catch(() => null) as Promise<TeacherUploadUrlResponse | null>;
}

/**
 * Prepares the create-resource form for a native PDF.
 *
 * Local storage stays on the buffered path (the file travels with the form).
 * Production storage returns a short-lived PUT URL so the bytes never enter
 * Next.js, then the form carries only the staging key for server-side checks.
 */
export async function stageNativePdfUpload(
  formData: FormData,
  file: File,
  fetchImpl: FetchLike = fetch,
): Promise<StageNativePdfResult> {
  formData.delete("file");
  formData.delete("objectKey");
  formData.delete("originalFileName");

  const urlResponse = await fetchImpl("/api/teacher/resources/upload-url", {
    method: "POST",
    credentials: "same-origin",
  }).catch(() => null);
  if (!urlResponse) {
    return failure("UPLOAD_FAILED", "The file could not be stored. Please try again.", true);
  }
  if (urlResponse.status === 429) return rateLimitedResult(urlResponse);
  if (!urlResponse.ok) {
    return failure("UPLOAD_FAILED", "The resource could not be saved. Please try again.", true);
  }

  const payload = await readUploadUrl(urlResponse);
  if (!payload || payload.ok !== true) {
    return failure(
      "UPLOAD_FAILED",
      payload && "message" in payload && payload.message
        ? payload.message
        : "The resource could not be saved. Please try again.",
      true,
    );
  }

  if (payload.mode === "buffered") {
    formData.set("file", file);
    return { ok: true, formData };
  }

  if (file.size > payload.maxBytes) {
    return failure("FILE_TOO_LARGE", "The file exceeds the upload limit.", false);
  }

  const putResponse = await fetchImpl(payload.url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": payload.requiredContentType },
  }).catch(() => null);
  if (!putResponse || !putResponse.ok) {
    return failure("UPLOAD_FAILED", "The file could not be stored. Please try again.", true);
  }

  formData.set("objectKey", payload.objectKey);
  formData.set("originalFileName", file.name);
  return { ok: true, formData };
}

export function parseTeacherResourceResponse(response: Response, body: unknown): TeacherResourceActionResult {
  if (response.status === 429) return rateLimitedResult(response);
  if (body && typeof body === "object" && "ok" in body) {
    return body as TeacherResourceActionResult;
  }
  return failure("UPLOAD_FAILED", "The resource could not be saved. Please try again.", true);
}
