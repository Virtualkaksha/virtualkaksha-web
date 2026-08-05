import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/server-only";

import { previewResourceImport } from "@/lib/admin/resource-import-preview";
import { RESOURCE_IMPORT_HEADERS, type ParsedResourceImportRow } from "@/lib/admin/resource-import-csv";

function row(overrides: Record<string, string> = {}): ParsedResourceImportRow {
  const values = Object.fromEntries(RESOURCE_IMPORT_HEADERS.map((header) => [header, ""])) as ParsedResourceImportRow["values"];
  Object.assign(values, { resource_id: "resource-1", expected_version: "2", title: "Updated title", resource_type_id: "type-1", language: "ENGLISH", access_level: "FREE", chapter_id: "chapter-1", reason: "Review metadata update" }, overrides);
  return { rowNumber: 2, values };
}
const current = { id: "resource-1", title: "Current title", titleHindi: null, description: null, resourceTypeId: "type-1", language: "ENGLISH", access: "FREE", chapterId: "chapter-1", examTopicId: null, status: "PENDING_REVIEW", version: 2, slug: "current-title" };
function repository(resource = current, collisions: Array<{ id: string; slug: string; chapterId: string | null; examTopicId: string | null }> = []) {
  return {
    findInputs: async () => ({ resources: resource ? [resource] : [], resourceTypes: [{ id: "type-1" }], chapters: [{ id: "chapter-1" }, { id: "chapter-2" }], examTopics: [{ id: "topic-1" }] }),
    findCollisions: async () => collisions,
  } as never;
}

test("preview detects valid changes, no-op and stale conflicts without mutations", async () => {
  const changed = await previewResourceImport([row()], repository());
  assert.equal(changed.rows[0].outcome, "VALID_CHANGE");
  assert.deepEqual(changed.rows[0].changedFields, ["title"]);
  const noOp = await previewResourceImport([row({ title: "Current title" })], repository());
  assert.equal(noOp.rows[0].outcome, "NO_OP");
  const stale = await previewResourceImport([row({ expected_version: "1" })], repository());
  assert.equal(stale.rows[0].outcome, "CONFLICT");
  assert.equal(stale.rows[0].safeToApply, false);
});

test("archived and inactive or missing references are invalid", async () => {
  const archived = await previewResourceImport([row()], repository({ ...current, status: "ARCHIVED" }));
  assert.equal(archived.rows[0].outcome, "INVALID");
  const missing = await previewResourceImport([row({ resource_type_id: "missing", chapter_id: "missing" })], repository());
  assert.equal(missing.rows[0].outcome, "INVALID");
  assert.equal(missing.rows[0].referenceErrors.length, 2);
});

test("stable identifiers, enums, mapping exclusivity and field limits fail closed", async () => {
  const result = await previewResourceImport([row({ resource_id: "bad id", expected_version: "0", title: "x", description: "x".repeat(4_001), resource_type_id: "bad id", language: "OTHER", access_level: "OTHER", chapter_id: "", exam_topic_id: "", reason: "short", board: "x".repeat(501) })], repository());
  assert.equal(result.rows[0].outcome, "INVALID");
  assert.ok(result.rows[0].validationErrors.length >= 8);
  assert.equal(result.rows[0].safeToApply, false);
});

test("published edits preview pending-review removal while published mapping changes are rejected", async () => {
  const published = { ...current, status: "PUBLISHED" as const };
  const edit = await previewResourceImport([row()], repository(published));
  assert.equal(edit.rows[0].resultingStatus, "PENDING_REVIEW");
  assert.equal(edit.rows[0].publicVisibilityRemoval, true);
  const mapping = await previewResourceImport([row({ chapter_id: "chapter-2" })], repository(published));
  assert.equal(mapping.rows[0].outcome, "INVALID");
  assert.match(mapping.rows[0].mappingChangeWarning ?? "", /cannot be changed/i);
});

test("mapping slug collisions are reported and output is sanitized", async () => {
  const result = await previewResourceImport([row({ chapter_id: "chapter-2" })], repository(current, [{ id: "other", slug: "current-title", chapterId: "chapter-2", examTopicId: null }]));
  assert.equal(result.rows[0].outcome, "INVALID");
  assert.match(result.rows[0].slugCollisionWarning ?? "", /slug/i);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /objectKey|contentUrl|externalUrl|provider|checksum|moderationNote|password|token|stack|P20\d\d/i);
});
