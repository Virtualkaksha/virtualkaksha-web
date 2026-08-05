import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import "./helpers/server-only";

import { buildResourceImportTemplateCsv, buildResourceInventoryCsv, protectSpreadsheetValue, RESOURCE_EXPORT_HEADERS, RESOURCE_IMPORT_TEMPLATE_HEADERS } from "@/lib/admin/resource-export";
import { handleResourceInventoryExport } from "@/app/admin/resources/export/route";

const row = {
  id: "stable-resource-id", slug: "safe-slug", title: '=HYPERLINK("bad")', titleHindi: null, description: 'Quoted "description"',
  board: "CBSE", level: "Class 10", subject: "Mathematics", unit: "Algebra", resourceTypeId: "type-id", resourceType: "Notes", chapterId: "chapter-id", examTopicId: null, format: "PDF" as const,
  language: "ENGLISH" as const, access: "FREE" as const, status: "PUBLISHED" as const, version: 3, uploader: "Not exported",
  assetSource: "NATIVE" as const, assetState: "READY" as const, primaryAssetAvailable: true, checksumPresent: true,
  pageCount: 12, fileSizeBytes: "1000", bookmarkCount: 2, progressCount: 1,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z",
  missingDescription: false, duplicateTitle: false, duplicateChecksum: true, legacySource: false as const,
};

test("CSV has exact headers, stable ID, version, timestamp and escaped cells", () => {
  const csv = buildResourceInventoryCsv([row]);
  assert.ok(csv.startsWith("\uFEFF"));
  for (const header of RESOURCE_EXPORT_HEADERS) assert.match(csv, new RegExp(`"${header}"`));
  assert.match(csv, /"stable-resource-id"/);
  assert.match(csv, /"3"/);
  assert.match(csv, /2026-01-02T00:00:00\.000Z/);
  assert.match(csv, /"Quoted ""description"""/);
  assert.doesNotMatch(csv, /Not exported|objectKey|provider|moderationNote|contentUrl/);
});

test("import template has exact stable-ID headers and protected editable cells", () => {
  const csv = buildResourceImportTemplateCsv([row]);
  assert.equal(csv.slice(1).split("\r\n", 1)[0], RESOURCE_IMPORT_TEMPLATE_HEADERS.map((value) => `"${value}"`).join(","));
  assert.match(csv, /"stable-resource-id","3"/);
  assert.match(csv, /"type-id"/);
  assert.match(csv, /"chapter-id","",""/);
  assert.match(csv, /"'=HYPERLINK\(""bad""\)"/);
  assert.doesNotMatch(csv, /Not exported|objectKey|provider|moderationNote|contentUrl|checksum/i);
});

test("spreadsheet formula prefixes are neutralized", () => {
  for (const value of ["=x", "+x", "-x", "@x", "\tx", "\rx"]) assert.equal(protectSpreadsheetValue(value), `'${value}`);
  assert.equal(protectSpreadsheetValue("ordinary"), "ordinary");
});

test("fresh ADMIN can export and other identities are denied", async () => {
  const request = new Request("https://virtual.test/admin/resources/export?status=PUBLISHED");
  const admin = await handleResourceInventoryExport(request, {
    resolveIdentity: async () => ({ ok: true, identity: { id: "admin", roles: ["ADMIN"], sessionVersion: 1 } }),
    getRows: async () => [row],
  });
  assert.equal(admin.status, 200);
  assert.equal(admin.headers.get("Cache-Control"), "private, no-store");
  assert.match(await admin.text(), /stable-resource-id/);
  for (const [code, status] of [["NO_SESSION", 401], ["FORBIDDEN", 403]] as const) {
    const denied = await handleResourceInventoryExport(request, { resolveIdentity: async () => ({ ok: false, code, message: "Access denied." }) });
    assert.equal(denied.status, status);
  }
});

test("dedicated import-template mode leaves operational inventory mode unchanged", async () => {
  const dependencies = { resolveIdentity: async () => ({ ok: true, identity: { id: "admin", roles: ["ADMIN"], sessionVersion: 1 } } satisfies import("@/lib/auth/current-identity").CurrentIdentityResult), getRows: async () => [row] };
  const template = await handleResourceInventoryExport(new Request("https://virtual.test/admin/resources/export?mode=import-template"), dependencies);
  assert.match(template.headers.get("content-disposition") ?? "", /resource-import-template/);
  assert.match(await template.text(), /"expected_version"/);
  const inventory = await handleResourceInventoryExport(new Request("https://virtual.test/admin/resources/export"), dependencies);
  assert.match(inventory.headers.get("content-disposition") ?? "", /resource-inventory/);
  assert.doesNotMatch(await inventory.text(), /"expected_version"/);
});

test("export route is GET-only and contains no mutation handler", async () => {
  const route = await readFile("app/admin/resources/export/route.ts", "utf8");
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.doesNotMatch(route, /create|update|delete|upsert|upload/i);
});
