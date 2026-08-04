import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("ADMIN action enforces origin, fresh identity, rate limits, validation and service in order", async () => {
  const source = await readFile("app/admin/resources/metadata-actions.ts", "utf8");
  const steps = ["if (!isSameOriginAction", 'await requireCurrentRole("ADMIN")', "await limitAdminModeration", "input = parseAdminResourceMetadata", "await updateAdminResourceMetadata"];
  for (let index = 1; index < steps.length; index++) assert.ok(source.indexOf(steps[index - 1]) < source.indexOf(steps[index]));
  assert.match(source, /"EDIT_METADATA"/);
  assert.match(source, /export async function updateAdminResourceMetadataAction/);
  assert.doesNotMatch(source, /resourceAsset\.|upload|objectKey|storage/i);
});

test("transaction uses version predicate, one increment and atomic audit creation", async () => {
  const source = await readFile("repositories/admin-resource-metadata.repository.ts", "utf8");
  assert.match(source, /prisma\.\$transaction/);
  assert.match(source, /version: input\.expectedVersion/);
  assert.match(source, /version: \{ increment: 1 \}/);
  assert.match(source, /tx\.resourceMetadataAudit\.create/);
  assert.match(source, /statusAfterAdminMetadataEdit/);
  assert.match(source, /SLUG_CONFLICT/);
  assert.doesNotMatch(source, /resourceAsset\.(create|update|delete)|objectKey|provider|originalFileName/);
  assert.doesNotMatch(source, /resourceBookmark\.(create|update|delete)|studentResourceProgress\.(create|update|delete)/);
});

test("audit schema is additive, restrictive and contains only approved audit fields", async () => {
  const schema = await readFile("prisma/schema.prisma", "utf8");
  const migration = await readFile("prisma/migrations/20260804210242_add_resource_metadata_audit/migration.sql", "utf8");
  assert.match(schema, /model ResourceMetadataAudit/);
  assert.match(schema, /beforeValues\s+Json/);
  assert.match(schema, /afterValues\s+Json/);
  assert.match(migration, /CREATE TYPE[\s\S]*CREATE TABLE[\s\S]*ON DELETE RESTRICT/);
  assert.doesNotMatch(migration, /^(DROP|DELETE|UPDATE|TRUNCATE)\b/m);
});

test("edit page is fresh-ADMIN protected, read-only for archived resources and exposes no replacement controls", async () => {
  const page = await readFile("app/admin/resources/[resourceId]/edit/page.tsx", "utf8");
  assert.match(page, /requireCurrentRole\("ADMIN"\)/);
  assert.match(page, /Archived resources are read-only/);
  assert.match(page, /PDF replacement/);
  assert.doesNotMatch(page, /type="file"|objectKey|provider|checksum/);
  assert.doesNotMatch(page, /contentUrl|externalUrl|thumbnailUrl/);
});
