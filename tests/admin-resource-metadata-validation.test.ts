import assert from "node:assert/strict";
import test from "node:test";

import { parseAdminResourceMetadata } from "@/lib/admin/resource-metadata-validation";

function validForm() {
  const form = new FormData();
  for (const [key, value] of Object.entries({ resourceId: "resource_1", expectedVersion: "2", title: "  Algebra   Notes  ", titleHindi: "  बीजगणित  ", description: "line one\r\nline two", resourceTypeId: "type_1", language: "ENGLISH", access: "FREE", chapterId: "chapter_1", examTopicId: "", reason: "Correcting missing metadata." })) form.set(key, value);
  return form;
}

test("strict parser normalizes the allowlisted metadata", () => {
  const parsed = parseAdminResourceMetadata(validForm());
  assert.equal(parsed.title, "Algebra Notes");
  assert.equal(parsed.titleHindi, "बीजगणित");
  assert.equal(parsed.description, "line one\nline two");
  assert.equal(parsed.expectedVersion, 2);
});
test("unknown, immutable, duplicate and actor-controlled fields are rejected", () => {
  for (const key of ["slug", "status", "format", "createdByUserId", "contentUrl", "externalUrl", "thumbnailUrl", "pageCount", "fileSizeBytes", "objectKey", "checksum", "actorUserId"]) {
    const form = validForm(); form.set(key, "attack");
    assert.throws(() => parseAdminResourceMetadata(form), /unsupported field/);
  }
  const duplicate = validForm(); duplicate.append("resourceId", "other");
  assert.throws(() => parseAdminResourceMetadata(duplicate), /exactly once/);
});

test("version, length, enum, reason and exclusive mapping boundaries fail closed", () => {
  const cases: Array<[string, string, RegExp]> = [
    ["expectedVersion", "0", /positive integer/], ["title", "ab", /at least 3/], ["title", "x".repeat(201), /too long/],
    ["language", "KLINGON", /invalid/], ["access", "PUBLIC", /invalid/], ["reason", "short", /at least 10/],
  ];
  for (const [key, value, message] of cases) { const form = validForm(); form.set(key, value); assert.throws(() => parseAdminResourceMetadata(form), message); }
  const neither = validForm(); neither.set("chapterId", ""); assert.throws(() => parseAdminResourceMetadata(neither), /Exactly one/);
  const both = validForm(); both.set("examTopicId", "topic_1"); assert.throws(() => parseAdminResourceMetadata(both), /Exactly one/);
});

test("documented Next.js action fields are tolerated but never returned", () => {
  const form = validForm(); form.set("$ACTION_ID_test", "framework");
  assert.doesNotMatch(JSON.stringify(parseAdminResourceMetadata(form)), /ACTION|framework/);
});
