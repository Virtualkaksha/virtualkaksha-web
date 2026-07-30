import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { handleAdminAssetRequest } from "@/app/api/admin/resources/[resourceId]/asset/route";
import { resolveAdminResourcePreview } from "@/lib/admin/resource-preview";

const readyPdf = {
  id: "resource-1",
  format: "PDF",
  assets: [{
    objectKey: "resources/resource-1/private.pdf",
    provider: "local",
    mimeType: "application/pdf",
    status: "READY",
    isPrimary: true,
  }],
};

test("ADMIN can preview a native READY PDF with private response headers", async () => {
  const response = await handleAdminAssetRequest("resource-1", {
    getCurrentUser: async () => ({ id: "admin-1", roles: ["ADMIN"] }),
    findResource: async () => readyPdf,
    readFile: async (provider, objectKey) => {
      assert.equal(provider, "local");
      assert.equal(objectKey, readyPdf.assets[0].objectKey);
      return Buffer.from("%PDF-admin-preview");
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("content-disposition"), 'inline; filename="resource.pdf"');
  const body = await response.text();
  assert.match(body, /^%PDF/);
  assert.doesNotMatch(body, /objectKey|provider|storage|bucket|private\.pdf/);
});

test("admin asset endpoint returns 401 before resource lookup when unauthenticated", async () => {
  let queried = false;
  const response = await handleAdminAssetRequest("resource-1", {
    getCurrentUser: async () => null,
    findResource: async () => { queried = true; return readyPdf; },
  });
  assert.equal(response.status, 401);
  assert.equal(queried, false);
});

test("STUDENT and TEACHER cannot use the admin asset endpoint", async () => {
  for (const role of ["STUDENT", "TEACHER"]) {
    const response = await handleAdminAssetRequest("resource-1", {
      getCurrentUser: async () => ({ id: `${role.toLowerCase()}-1`, roles: [role] }),
      findResource: async () => readyPdf,
    });
    assert.equal(response.status, 403, role);
  }
});

test("non-PDF, missing, non-ready, invalid MIME and invalid bytes fail safely", async () => {
  const resources = [
    { ...readyPdf, format: "VIDEO" },
    { ...readyPdf, assets: [] },
    { ...readyPdf, assets: [{ ...readyPdf.assets[0], status: "FAILED" }] },
    { ...readyPdf, assets: [{ ...readyPdf.assets[0], mimeType: "text/plain" }] },
  ];
  for (const resource of resources) {
    const response = await handleAdminAssetRequest("resource-1", {
      getCurrentUser: async () => ({ id: "admin-1", roles: ["ADMIN"] }),
      findResource: async () => resource,
      readFile: async () => Buffer.from("%PDF-valid"),
    });
    assert.equal(response.status, 404);
  }
  const invalidBytes = await handleAdminAssetRequest("resource-1", {
    getCurrentUser: async () => ({ id: "admin-1", roles: ["ADMIN"] }),
    findResource: async () => readyPdf,
    readFile: async () => Buffer.from("not a PDF"),
  });
  assert.equal(invalidBytes.status, 404);
});

test("local and S3 assets are read through the provider abstraction", async () => {
  for (const provider of ["local", "s3"]) {
    let selectedProvider = "";
    const response = await handleAdminAssetRequest("resource-1", {
      getCurrentUser: async () => ({ id: "admin-1", roles: ["ADMIN"] }),
      findResource: async () => ({
        ...readyPdf,
        assets: [{ ...readyPdf.assets[0], provider }],
      }),
      readFile: async (value) => {
        selectedProvider = value;
        return Buffer.from("%PDF-private");
      },
    });
    assert.equal(response.status, 200);
    assert.equal(selectedProvider, provider);
  }
});

test("admin moderation data selects and maps only safe native asset metadata", async () => {
  const repository = await readFile("repositories/admin-moderation.repository.ts", "utf8");
  const service = await readFile("lib/admin/moderation.ts", "utf8");
  const page = await readFile("app/admin/resources/[resourceId]/page.tsx", "utf8");
  const detailSelection = repository.slice(repository.indexOf("export async function findModerationResource"));
  assert.match(detailSelection, /select: \{ status: true \}/);
  assert.doesNotMatch(detailSelection, /objectKey|provider: true|checksum|originalFileName|contentUrl: true/);
  assert.match(service, /const \{ assets, \.\.\.safeItem \} = item/);
  assert.match(service, /nativePdf/);
  assert.match(service, /isNativePdf/);
  assert.match(service, /hasPrimaryAsset/);
  assert.match(service, /assetStatus/);
  assert.doesNotMatch(page, /objectKey|checksum|originalFileName|contentUrl/);
});

test("native preview is available only for a READY primary asset", () => {
  const base = { id: "resource-1", format: "PDF", externalUrl: null };
  assert.deepEqual(
    resolveAdminResourcePreview({ ...base, nativePdf: { isNativePdf: true, hasPrimaryAsset: true, assetStatus: "READY" } }),
    { kind: "native-pdf", url: "/api/admin/resources/resource-1/asset" },
  );
  for (const status of ["UPLOADING", "FAILED", "DELETED"]) {
    assert.deepEqual(
      resolveAdminResourcePreview({ ...base, nativePdf: { isNativePdf: true, hasPrimaryAsset: true, assetStatus: status } }),
      { kind: "native-pdf-unavailable", status },
    );
  }
  assert.deepEqual(
    resolveAdminResourcePreview({ ...base, nativePdf: { isNativePdf: true, hasPrimaryAsset: false, assetStatus: "MISSING" } }),
    { kind: "native-pdf-unavailable", status: "MISSING" },
  );
});

test("external previews require HTTPS and the moderation iframe is sandboxed", async () => {
  const base = { id: "resource-1", format: "PDF", nativePdf: { isNativePdf: false, hasPrimaryAsset: false, assetStatus: null } };
  assert.deepEqual(
    resolveAdminResourcePreview({ ...base, externalUrl: "https://example.com/resource.pdf" }),
    { kind: "external", url: "https://example.com/resource.pdf" },
  );
  for (const externalUrl of [
    "http://example.com/resource.pdf",
    "javascript:alert(1)",
    "data:application/pdf;base64,AA==",
    "file:///private/resource.pdf",
    "not-a-url",
  ]) {
    assert.deepEqual(resolveAdminResourcePreview({ ...base, externalUrl }), { kind: "unavailable" });
  }
  const page = await readFile("app/admin/resources/[resourceId]/page.tsx", "utf8");
  assert.match(page, /preview\.kind === "external"/);
  assert.match(page, /sandbox=""/);
  assert.match(page, /referrerPolicy="no-referrer"/);
  assert.match(page, /preview\.kind === "native-pdf"/);
  assert.match(page, />Preview PDF/);
});
