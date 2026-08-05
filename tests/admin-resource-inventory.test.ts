import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import "./helpers/server-only";

import {
  buildResourceInventoryWhere,
  findDuplicateResourceIds,
  mapResourceInventoryRow,
  parseResourceInventoryFilters,
  RESOURCE_INVENTORY_MAX_PAGE_SIZE,
} from "@/lib/admin/resource-inventory";

const duplicateInputs = {
  titles: [{ id: "one", title: " Algebra " }, { id: "two", title: "algebra" }, { id: "three", title: "Geometry" }],
  checksums: [{ resourceId: "one", checksum: "same" }, { resourceId: "two", checksum: "same" }, { resourceId: "three", checksum: "other" }],
};

test("inventory filters are validated and pagination is bounded", () => {
  const filters = parseResourceInventoryFilters({ status: "owner", language: "Klingon", board: "../bad", page: "-2", pageSize: "9999", assetHealth: "ready" });
  assert.equal(filters.status, "");
  assert.equal(filters.language, "");
  assert.equal(filters.board, "");
  assert.equal(filters.page, 1);
  assert.equal(filters.pageSize, RESOURCE_INVENTORY_MAX_PAGE_SIZE);
  assert.equal(filters.assetHealth, "READY");
});

test("duplicate title and checksum detection is normalized and resource-scoped", () => {
  const duplicate = findDuplicateResourceIds(duplicateInputs);
  assert.deepEqual([...duplicate.duplicateTitleIds].sort(), ["one", "two"]);
  assert.deepEqual([...duplicate.duplicateChecksumIds].sort(), ["one", "two"]);
  assert.equal(duplicate.duplicateTitleGroupCount, 1);
  assert.equal(duplicate.duplicateChecksumGroupCount, 1);
});

test("asset health, aggregate counts, legacy source and missing description map safely", () => {
  const duplicate = findDuplicateResourceIds(duplicateInputs);
  const row = mapResourceInventoryRow({
    id: "one", slug: "algebra", title: "Algebra", titleHindi: null, description: null, format: "PDF", language: "ENGLISH",
    access: "FREE", status: "PUBLISHED", version: 1, contentUrl: "https://legacy.invalid/file.pdf", externalUrl: null, textContent: null,
    pageCount: 10, fileSizeBytes: BigInt("1000"), createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-02"),
    resourceType: { id: "type-id", name: "Notes" }, createdBy: { displayName: "Teacher", firstName: "T", lastName: null }, assets: [],
    chapter: { id: "chapter-id", name: "Algebra", boardClassSubject: { board: { shortName: "CBSE" }, classLevel: { name: "Class 10" }, subject: { name: "Mathematics" } } }, examTopic: null,
    _count: { bookmarks: 2, progress: 3 },
  }, duplicate);
  assert.equal(row.assetState, "LEGACY");
  assert.equal(row.assetSource, "LEGACY_CONTENT_URL");
  assert.equal(row.missingDescription, true);
  assert.equal(row.duplicateTitle, true);
  assert.equal(row.duplicateChecksum, true);
  assert.deepEqual([row.bookmarkCount, row.progressCount], [2, 3]);
  assert.doesNotMatch(JSON.stringify(row), /objectKey|provider|legacy\.invalid/);
});

test("database predicates support duplicate, legacy, description and asset health filters", () => {
  const filters = parseResourceInventoryFilters({ duplicateTitle: "true", duplicateChecksum: "true", legacySource: "true", missingDescription: "true", assetHealth: "LEGACY" });
  const where = JSON.stringify(buildResourceInventoryWhere(filters, findDuplicateResourceIds(duplicateInputs)));
  for (const value of ["one", "two", "contentUrl", "description", "assets"]) assert.match(where, new RegExp(value));
});

test("inventory page is ADMIN-protected, read-only and linked only from admin UI", async () => {
  const page = await readFile("app/admin/resources/inventory/page.tsx", "utf8");
  const layout = await readFile("app/admin/layout.tsx", "utf8");
  const repository = await readFile("repositories/resource-inventory.repository.ts", "utf8");
  assert.match(page, /requireCurrentRole\("ADMIN"\)/);
  assert.match(layout, /href="\/admin\/resources\/inventory"/);
  assert.doesNotMatch(page, /<form[^>]+action=|deleteResource|replaceResource|approveResource|rejectResource|archiveResource/);
  assert.doesNotMatch(repository, /objectKey|email: true|moderationNote|password|token/);
  assert.match(repository, /orderBy: \[\{ updatedAt: "desc" \}, \{ id: "asc" \}\]/);
});
