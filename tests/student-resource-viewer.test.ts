import test from "node:test";
import assert from "node:assert/strict";

import "./helpers/server-only";

import { handleStudentAssetRequest } from "@/app/api/student/resources/[resourceId]/asset/route";
import {
  authorizeStudentResourceAssetAccess,
  getStudentResourceProgress,
  resolveStudentResourceDownloadUrl,
  resolveStudentResourceViewerState,
  saveStudentResourceProgress,
  type StudentUser,
} from "@/lib/resources/student-resource-service";

const student: StudentUser = { id: "student-1", roles: ["STUDENT"] };
const publishedPdf = { id: "res-1", status: "PUBLISHED", format: "PDF", contentUrl: null, externalUrl: null, access: "FREE", pageCount: 10 };
const readyAsset = { id: "asset-1", status: "READY", isPrimary: true, provider: "local", mimeType: "application/pdf", objectKey: "resources/res-1/file.pdf" };

function assetResource(overrides: Record<string, unknown> = {}) {
  return { ...publishedPdf, assets: [readyAsset], ...overrides };
}

function progressClient(options: {
  resource?: Partial<typeof publishedPdf> | null;
  existing?: { lastPosition: number | null; progressPercent: number; status: string } | null;
  onUpsert?: (args: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }) => void;
} = {}) {
  const resource = options.resource === null ? null : { ...publishedPdf, ...options.resource };
  const existing = options.existing === undefined ? { lastPosition: 3, progressPercent: 30, status: "IN_PROGRESS" } : options.existing;
  return {
    studentProfile: { findUnique: async () => ({ id: "profile-1" }) },
    resource: { findFirst: async () => resource },
    studentResourceProgress: {
      findUnique: async () => existing,
      findFirst: async () => existing,
      upsert: async (args: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        options.onUpsert?.(args);
        const base = existing ?? { lastPosition: null, progressPercent: 0, status: "NOT_STARTED" };
        return {
          lastPosition: "lastPosition" in args.update ? args.update.lastPosition as number | null : base.lastPosition,
          progressPercent: "progressPercent" in args.update ? args.update.progressPercent as number : base.progressPercent,
          status: args.update.status as string,
        };
      },
    },
  };
}

test("unauthenticated native PDF access is rejected", () => {
  const result = authorizeStudentResourceAssetAccess({ user: null, resource: publishedPdf, asset: readyAsset });
  assert.equal(result.ok, false);
  assert.equal(result.code, "UNAUTHENTICATED");
});

test("authenticated non-student access is rejected", () => {
  const result = authorizeStudentResourceAssetAccess({ user: { id: "teacher-1", roles: ["TEACHER"] }, resource: publishedPdf, asset: readyAsset });
  assert.equal(result.ok, false);
  assert.equal(result.code, "FORBIDDEN");
});

test("unpublished resource asset is not accessible", () => {
  const result = authorizeStudentResourceAssetAccess({ user: student, resource: { ...publishedPdf, status: "DRAFT" }, asset: readyAsset });
  assert.equal(result.ok, false);
  assert.equal(result.code, "RESOURCE_UNAVAILABLE");
});

test("non-PDF resource asset is not accessible", () => {
  const result = authorizeStudentResourceAssetAccess({ user: student, resource: { ...publishedPdf, format: "VIDEO" }, asset: readyAsset });
  assert.equal(result.ok, false);
  assert.equal(result.code, "RESOURCE_UNAVAILABLE");
});

test("missing and non-READY assets are rejected", () => {
  const missing = authorizeStudentResourceAssetAccess({ user: student, resource: publishedPdf, asset: null });
  const pending = authorizeStudentResourceAssetAccess({ user: student, resource: publishedPdf, asset: { ...readyAsset, status: "UPLOADING" } });
  assert.equal(missing.ok, false);
  assert.equal(missing.code, "ASSET_NOT_READY");
  assert.equal(pending.ok, false);
  assert.equal(pending.code, "ASSET_NOT_READY");
});

test("unsupported provider and invalid MIME are rejected", () => {
  const provider = authorizeStudentResourceAssetAccess({ user: student, resource: publishedPdf, asset: { ...readyAsset, provider: "public-url" } });
  const mime = authorizeStudentResourceAssetAccess({ user: student, resource: publishedPdf, asset: { ...readyAsset, mimeType: "text/html" } });
  assert.equal(provider.ok, false);
  assert.equal(provider.code, "UNSUPPORTED_PROVIDER");
  assert.equal(mime.ok, false);
  assert.equal(mime.code, "INVALID_ASSET");
});

test("S3 assets retain the same protected student URL", () => {
  const result = authorizeStudentResourceAssetAccess({ user: student, resource: publishedPdf, asset: { ...readyAsset, provider: "s3" } });
  assert.equal(result.ok, true);
  if (!result.ok) assert.fail("Expected S3 asset authorization to succeed.");
  assert.equal(result.readUrl, "/api/student/resources/res-1/asset");
});

test("READY published local PDF resolves to the protected URL", () => {
  const result = authorizeStudentResourceAssetAccess({ user: student, resource: publishedPdf, asset: readyAsset });
  assert.equal(result.ok, true);
  assert.equal(result.readUrl, "/api/student/resources/res-1/asset");
  assert.equal(result.contentType, "application/pdf");
  assert.doesNotMatch(result.readUrl, /storage\//i);
  const state = resolveStudentResourceViewerState({ resource: { ...publishedPdf, contentUrl: "/raw/storage/file.pdf", externalUrl: "https://example.com/fallback.pdf" }, asset: readyAsset });
  assert.equal(state.sourceUrl, "/api/student/resources/res-1/asset");
  assert.equal(resolveStudentResourceDownloadUrl({ resource: publishedPdf, asset: readyAsset }), "/api/student/resources/res-1/asset");
});

test("failed, deleted, and not-ready native PDFs never fall back to contentUrl", () => {
  for (const status of ["FAILED", "DELETED", "UPLOADING"]) {
    const asset = { ...readyAsset, status };
    const resource = { ...publishedPdf, contentUrl: "https://storage.example.com/raw.pdf" };
    const state = resolveStudentResourceViewerState({ resource, asset });
    assert.equal(state.sourceUrl, "", status);
    assert.equal(resolveStudentResourceDownloadUrl({ resource, asset }), null, status);
  }
});

test("legitimate external PDF uses only validated externalUrl for viewing and download", () => {
  const state = resolveStudentResourceViewerState({
    resource: { ...publishedPdf, contentUrl: "https://storage.example.com/raw.pdf", externalUrl: "https://example.com/file.pdf" },
    asset: null,
  });
  assert.equal(state.viewerType, "external");
  assert.equal(state.sourceUrl, "https://example.com/file.pdf");
  assert.equal(resolveStudentResourceDownloadUrl({ resource: { ...publishedPdf, externalUrl: "https://example.com/file.pdf" }, asset: null }), "https://example.com/file.pdf");
});

test("invalid external PDF URL and missing usable source fail safely", () => {
  for (const externalUrl of ["file:///private/file.pdf", "javascript:alert(1)", "not-a-url", null]) {
    const resource = { ...publishedPdf, contentUrl: "https://storage.example.com/raw.pdf", externalUrl };
    const state = resolveStudentResourceViewerState({ resource, asset: null });
    assert.equal(state.sourceUrl, "", String(externalUrl));
    assert.equal(resolveStudentResourceDownloadUrl({ resource, asset: null }), null, String(externalUrl));
  }
});

test("asset route returns 401 for unauthenticated access", async () => {
  const response = await handleStudentAssetRequest("res-1", {
    getCurrentUser: async () => null,
    findResource: async () => assetResource(),
  });
  assert.equal(response.status, 401);
});

test("asset route rejects malicious object keys", async () => {
  const response = await handleStudentAssetRequest("res-1", {
    getCurrentUser: async () => student,
    findResource: async () => assetResource({ assets: [{ ...readyAsset, objectKey: "../secret.pdf" }] }),
    readFile: async (_provider, objectKey) => {
      assert.equal(objectKey, "../secret.pdf");
      throw new Error("Invalid object key");
    },
  });
  assert.equal(response.status, 404);
});

test("asset route returns a forced PDF response for a valid local file", async () => {
  const response = await handleStudentAssetRequest("res-1", {
    getCurrentUser: async () => student,
    findResource: async () => assetResource(),
    readLocalFile: async () => Buffer.from("%PDF-1.7 test"),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("progress authorization rejects non-students and inaccessible resources", async () => {
  const nonStudent = await saveStudentResourceProgress({
    user: { id: "teacher-1", roles: ["TEACHER"] },
    prismaClient: progressClient(),
    resourceId: "res-1",
    payload: { page: 2 },
  });
  const premium = await saveStudentResourceProgress({
    user: student,
    prismaClient: progressClient({ resource: { access: "PREMIUM" } }),
    resourceId: "res-1",
    payload: { page: 2 },
  });
  assert.equal(nonStudent.ok, false);
  assert.equal(nonStudent.code, "FORBIDDEN");
  assert.equal(premium.ok, false);
  assert.equal(premium.code, "FORBIDDEN");
});

test("partial progress updates preserve omitted fields", async () => {
  let update: Record<string, unknown> = {};
  const result = await saveStudentResourceProgress({
    user: student,
    prismaClient: progressClient({ onUpsert: (args) => { update = args.update; } }),
    resourceId: "res-1",
    payload: { percent: 40 },
  });
  assert.equal(result.ok, true);
  assert.equal(result.progress.page, 3);
  assert.equal("lastPosition" in update, false);
  assert.equal(update.progressPercent, 40);
});

test("page is clamped to pageCount and marks completion", async () => {
  let update: Record<string, unknown> = {};
  const result = await saveStudentResourceProgress({
    user: student,
    prismaClient: progressClient({ onUpsert: (args) => { update = args.update; } }),
    resourceId: "res-1",
    payload: { page: 99 },
  });
  assert.equal(result.ok, true);
  assert.equal(result.progress.page, 10);
  assert.equal(result.progress.percent, 100);
  assert.equal(result.progress.completed, true);
  assert.equal(update.status, "COMPLETED");
  assert.ok(update.completedAt instanceof Date);
});

test("progress restore returns the current student's page", async () => {
  const result = await getStudentResourceProgress({ user: student, prismaClient: progressClient(), resourceId: "res-1" });
  assert.equal(result.ok, true);
  assert.equal(result.progress.page, 3);
  assert.equal(result.progress.percent, 30);
});
