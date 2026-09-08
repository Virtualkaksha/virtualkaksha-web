import assert from "node:assert/strict";
import test from "node:test";

import { stageNativePdfUpload } from "@/app/teacher/resources/stage-native-pdf-upload";

const pdf = new File(["%PDF-1"], "lesson.pdf", { type: "application/pdf" });

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

test("buffered mode keeps the file on the form and never PUTs to storage", async () => {
  const calls: Array<{ url: string; method?: string }> = [];
  const formData = new FormData();
  formData.set("file", pdf);
  formData.set("title", "Notes");

  const result = await stageNativePdfUpload(formData, pdf, async (url, init) => {
    calls.push({ url: String(url), method: typeof init?.method === "string" ? init.method : "GET" });
    return jsonResponse({ ok: true, mode: "buffered" });
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.formData.get("title"), "Notes");
  assert.equal((result.formData.get("file") as File).name, "lesson.pdf");
  assert.equal(result.formData.get("objectKey"), null);
  assert.deepEqual(calls, [{ url: "/api/teacher/resources/upload-url", method: "POST" }]);
});

test("presigned mode PUTs the PDF then sends only the staging key", async () => {
  const calls: Array<{ url: string; method?: string; contentType?: string | null }> = [];
  const formData = new FormData();
  formData.set("file", pdf);

  const result = await stageNativePdfUpload(formData, pdf, async (url, init) => {
    const headers = new Headers(init?.headers);
    calls.push({
      url: String(url),
      method: typeof init?.method === "string" ? init.method : "GET",
      contentType: headers.get("Content-Type"),
    });
    if (String(url) === "/api/teacher/resources/upload-url") {
      return jsonResponse({
        ok: true,
        mode: "presigned",
        url: "https://storage.test/put",
        objectKey: "uploads/teacher-1/550e8400-e29b-41d4-a716-446655440000.pdf",
        requiredContentType: "application/pdf",
        expiresInSeconds: 60,
        maxBytes: 20 * 1024 * 1024,
      });
    }
    assert.equal(init?.body, pdf);
    return new Response(null, { status: 200 });
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.formData.get("file"), null);
  assert.equal(result.formData.get("objectKey"), "uploads/teacher-1/550e8400-e29b-41d4-a716-446655440000.pdf");
  assert.equal(result.formData.get("originalFileName"), "lesson.pdf");
  assert.deepEqual(calls, [
    { url: "/api/teacher/resources/upload-url", method: "POST", contentType: null },
    { url: "https://storage.test/put", method: "PUT", contentType: "application/pdf" },
  ]);
});

test("a failed storage PUT is retryable and does not leave an object key on the form", async () => {
  const formData = new FormData();
  const result = await stageNativePdfUpload(formData, pdf, async (url) => {
    if (String(url) === "/api/teacher/resources/upload-url") {
      return jsonResponse({
        ok: true,
        mode: "presigned",
        url: "https://storage.test/put",
        objectKey: "uploads/teacher-1/550e8400-e29b-41d4-a716-446655440000.pdf",
        requiredContentType: "application/pdf",
        expiresInSeconds: 60,
        maxBytes: 20 * 1024 * 1024,
      });
    }
    return new Response(null, { status: 403 });
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "UPLOAD_FAILED");
  assert.equal(result.retryable, true);
  assert.equal(formData.get("objectKey"), null);
});
