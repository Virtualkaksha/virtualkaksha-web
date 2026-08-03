import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import "./helpers/server-only";

import { handleTeacherAssetRequest } from "@/app/api/teacher/resources/[resourceId]/asset/route";
import { updateTeacherResourceMetadata } from "@/lib/teacher/resource-management";

const readyPdf = {
  id: "resource-1",
  createdByUserId: "teacher-1",
  format: "PDF",
  assets: [{ objectKey: "resources/resource-1/file.pdf", provider: "local", mimeType: "application/pdf", status: "READY", isPrimary: true }],
};

test("creator-owned READY native PDF returns a protected PDF response", async () => {
  const response = await handleTeacherAssetRequest("resource-1", {
    getCurrentUser: async () => ({ id: "teacher-1", roles: ["TEACHER"] }),
    findResource: async () => readyPdf,
    readLocalFile: async () => Buffer.from("%PDF-secure"),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("another teacher cannot preview a guessed resource ID", async () => {
  const response = await handleTeacherAssetRequest("resource-1", {
    getCurrentUser: async () => ({ id: "teacher-2", roles: ["TEACHER"] }),
    findResource: async () => readyPdf,
    readLocalFile: async () => Buffer.from("%PDF-secret"),
  });
  assert.equal(response.status, 404);
});

test("students and unauthenticated users cannot preview teacher assets", async () => {
  const anonymous = await handleTeacherAssetRequest("resource-1", { getCurrentUser: async () => null });
  const student = await handleTeacherAssetRequest("resource-1", { getCurrentUser: async () => ({ id: "student-1", roles: ["STUDENT"] }) });
  assert.equal(anonymous.status, 401);
  assert.equal(student.status, 403);
});

test("admin preview remains allowed by teacher-route policy", async () => {
  const response = await handleTeacherAssetRequest("resource-1", {
    getCurrentUser: async () => ({ id: "admin-1", roles: ["ADMIN"] }),
    findResource: async () => readyPdf,
    readLocalFile: async () => Buffer.from("%PDF-admin"),
  });
  assert.equal(response.status, 200);
});

test("non-PDF, non-ready, unsupported and missing assets fail safely", async () => {
  for (const resource of [
    { ...readyPdf, format: "VIDEO" },
    { ...readyPdf, assets: [{ ...readyPdf.assets[0], status: "FAILED" }] },
    { ...readyPdf, assets: [{ ...readyPdf.assets[0], provider: "public-url" }] },
    { ...readyPdf, assets: [] },
  ]) {
    const response = await handleTeacherAssetRequest("resource-1", {
      getCurrentUser: async () => ({ id: "teacher-1", roles: ["TEACHER"] }),
      findResource: async () => resource,
    });
    assert.equal(response.status, 404);
  }
});

test("creator-owned S3 PDF is read through the protected teacher response", async () => {
  const response = await handleTeacherAssetRequest("resource-1", {
    getCurrentUser: async () => ({ id: "teacher-1", roles: ["TEACHER"] }),
    findResource: async () => ({ ...readyPdf, assets: [{ ...readyPdf.assets[0], provider: "s3" }] }),
    readFile: async (provider, objectKey) => {
      assert.equal(provider, "s3");
      assert.equal(objectKey, readyPdf.assets[0].objectKey);
      return Buffer.from("%PDF-private-s3");
    },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("missing and non-PDF S3 objects fail safely", async () => {
  const resource = { ...readyPdf, assets: [{ ...readyPdf.assets[0], provider: "s3" }] };
  for (const readFile of [
    async () => { throw new Error("NoSuchKey"); },
    async () => Buffer.from("not-a-pdf"),
  ]) {
    const response = await handleTeacherAssetRequest("resource-1", {
      getCurrentUser: async () => ({ id: "teacher-1", roles: ["TEACHER"] }),
      findResource: async () => resource,
      readFile,
    });
    assert.equal(response.status, 404);
  }
});

test("preview response never serializes storage identifiers", async () => {
  const source = await readFile("app/api/teacher/resources/[resourceId]/asset/route.ts", "utf8");
  const responseSection = source.slice(source.indexOf("return new NextResponse"));
  assert.doesNotMatch(responseSection, /objectKey|provider|checksum|storage|originalFileName/);
});

test("metadata edit writes only allowlisted fields and preserves rejected status", async () => {
  const formData = new FormData();
  formData.set("title", "Updated title");
  formData.set("titleHindi", "अपडेट");
  formData.set("description", "Updated description");
  formData.set("resourceTypeId", "type-1");
  formData.set("mapping", "CHAPTER:chapter-1");
  formData.set("language", "ENGLISH");
  formData.set("access", "FREE");
  formData.set("thumbnailUrl", "https://example.com/thumb.png");
  formData.set("pageCount", "12");
  formData.set("slug", "attacker-slug");
  formData.set("createdByUserId", "attacker");
  formData.set("status", "PUBLISHED");
  formData.set("objectKey", "secret/path");
  let received: Record<string, unknown> | undefined;
  const result = await updateTeacherResourceMetadata(
    { user: { id: "teacher-1", roles: ["TEACHER"] }, resourceId: "resource-1", format: "PDF", currentStatus: "REJECTED", formData },
    async (input) => { received = input; return { count: 1, reason: null }; },
  );
  assert.equal(result.ok, true);
  assert.equal(received?.userId, "teacher-1");
  const data = received?.data as Record<string, unknown>;
  assert.equal(data.title, "Updated title");
  assert.equal(data.pageCount, 12);
  for (const forbidden of ["slug", "createdByUserId", "status", "format", "objectKey", "assets", "provider"]) assert.equal(forbidden in data, false);
});

test("pending, published and archived edits fail before repository access", async () => {
  for (const status of ["PENDING_REVIEW", "PUBLISHED", "ARCHIVED"] as const) {
    let called = false;
    const result = await updateTeacherResourceMetadata(
      { user: { id: "teacher-1", roles: ["TEACHER"] }, resourceId: "resource-1", format: "PDF", currentStatus: status, formData: new FormData() },
      async () => { called = true; return { count: 1, reason: null }; },
    );
    assert.equal(result.ok, false);
    assert.equal(called, false);
  }
});

test("invalid URLs, numbers and mappings are rejected", async () => {
  const base = new FormData();
  base.set("title", "Title"); base.set("resourceTypeId", "type-1"); base.set("mapping", "CHAPTER:chapter-1"); base.set("language", "ENGLISH"); base.set("access", "FREE");
  for (const [field, value] of [["thumbnailUrl", "file:///secret"], ["pageCount", "2junk"], ["mapping", "INVALID:value"]]) {
    const form = new FormData();
    for (const [key, item] of base.entries()) form.set(key, item);
    form.set(field, value);
    const result = await updateTeacherResourceMetadata({ user: { id: "teacher-1", roles: ["TEACHER"] }, resourceId: "resource-1", format: "PDF", currentStatus: "DRAFT", formData: form }, async () => ({ count: 1, reason: null }));
    assert.equal(result.ok, false);
  }
});

test("routes separate listing, creation, safe detail and allowed edit states", async () => {
  const listing = await readFile("app/teacher/resources/page.tsx", "utf8");
  const create = await readFile("app/teacher/resources/new/page.tsx", "utf8");
  const detail = await readFile("app/teacher/resources/[resourceId]/page.tsx", "utf8");
  const edit = await readFile("app/teacher/resources/[resourceId]/edit/page.tsx", "utf8");
  const repository = await readFile("repositories/teacher-resource.repository.ts", "utf8");
  assert.doesNotMatch(listing, /<ResourceCreateForm/);
  assert.match(listing, /href="\/teacher\/resources\/new"/);
  assert.match(listing, /href=\{`\/teacher\/resources\/\$\{resource\.id\}`\}/);
  assert.match(create, /<ResourceCreateForm/);
  assert.match(detail, /getTeacherManagedResource/);
  assert.doesNotMatch(detail, /objectKey|checksum|originalFileName|file path/i);
  assert.match(edit, /findEditableTeacherManagedResource/);
  assert.match(repository, /status: \{ in: \["DRAFT", "REJECTED"\] \}/);
});
