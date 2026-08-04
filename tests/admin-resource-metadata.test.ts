import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/server-only";

import { canAdminEditResourceMapping, canAdminEditResourceMetadata, statusAfterAdminMetadataEdit } from "@/lib/admin/resource-metadata-policy";
import { updateAdminResourceMetadata } from "@/lib/admin/resource-metadata-service";

const input = { resourceId: "resource_1", expectedVersion: 1, title: "Algebra", titleHindi: null, description: "Description", resourceTypeId: "type_1", language: "ENGLISH" as const, access: "FREE" as const, chapterId: "chapter_1", examTopicId: null, reason: "Correcting the description.", actorUserId: "admin_1" };

test("status policy preserves editable states, locks archived and republishes through review", () => {
  for (const status of ["DRAFT", "REJECTED", "PENDING_REVIEW"] as const) { assert.equal(canAdminEditResourceMetadata(status), true); assert.equal(canAdminEditResourceMapping(status), true); assert.equal(statusAfterAdminMetadataEdit(status), status); }
  assert.equal(canAdminEditResourceMapping("PUBLISHED"), false);
  assert.equal(statusAfterAdminMetadataEdit("PUBLISHED"), "PENDING_REVIEW");
  assert.equal(canAdminEditResourceMetadata("ARCHIVED"), false);
});
test("updated, no-op and stale outcomes are safe and deterministic", async () => {
  const updated = await updateAdminResourceMetadata(input, async () => ({ outcome: "UPDATED", version: 2, previousPath: "/old", currentPath: "/new" }));
  assert.deepEqual(updated, { ok: true, changed: true, version: 2, previousPath: "/old", currentPath: "/new" });
  const noChange = await updateAdminResourceMetadata(input, async () => ({ outcome: "NO_CHANGE", version: 1 }));
  assert.deepEqual(noChange, { ok: true, changed: false, version: 1 });
  const conflict = await updateAdminResourceMetadata(input, async () => ({ outcome: "CONFLICT" }));
  assert.equal(conflict.ok, false); if (!conflict.ok) assert.match(conflict.message, /changed after you opened/);
});

test("repository failures and policy failures do not leak database details", async () => {
  const failed = await updateAdminResourceMetadata(input, async () => { throw new Error("P2002 host secret objectKey"); });
  assert.deepEqual(failed, { ok: false, code: "UNAVAILABLE", message: "Resource metadata could not be saved. Try again later." });
  for (const outcome of ["READ_ONLY", "INVALID_REFERENCE", "MAPPING_LOCKED", "SLUG_CONFLICT"] as const) {
    const result = await updateAdminResourceMetadata(input, async () => ({ outcome }));
    assert.equal(result.ok, false);
  }
});
