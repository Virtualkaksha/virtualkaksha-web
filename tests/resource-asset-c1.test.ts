import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { resolveActiveAsset } from "@/lib/resources/active-asset";

test("active pointer is authoritative and fallback exists only without a pointer", () => {
  const fallback = { id: "fallback", status: "READY" };
  const active = { id: "active", status: "READY" };
  assert.equal(resolveActiveAsset({ activeAssetId: "active", activeAsset: active, assets: [fallback] }), active);
  assert.equal(resolveActiveAsset({ activeAssetId: "missing", activeAsset: null, assets: [fallback] }), null);
  assert.equal(resolveActiveAsset({ activeAssetId: null, activeAsset: null, assets: [fallback] }), fallback);
});

test("migration deterministically versions assets and backfills only one READY primary", async () => {
  const sql = await readFile("prisma/migrations/20260811024718_stage_c1_asset_foundation/migration.sql", "utf8");
  assert.match(sql, /PARTITION BY "resourceId"[\s\S]*ORDER BY "createdAt" ASC, "id" ASC/);
  assert.match(sql, /WHERE "status" = 'READY' AND "isPrimary" = true[\s\S]*HAVING COUNT\(\*\) = 1/);
  assert.match(sql, /ALTER COLUMN "assetVersion" SET NOT NULL/);
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|DELETE FROM|TRUNCATE/i);
});

test("deferred trigger rejects cross-resource and non-READY pointers without mutating rows", async () => {
  const sql = await readFile("prisma/migrations/20260811024718_stage_c1_asset_foundation/migration.sql", "utf8");
  assert.match(sql, /"asset"\."resourceId" <> "resource"\."id"/);
  assert.match(sql, /"asset"\."status" <> 'READY'/);
  assert.match(sql, /DEFERRABLE INITIALLY DEFERRED/g);
  const functionBody = sql.slice(sql.indexOf("LANGUAGE plpgsql"), sql.indexOf("CREATE CONSTRAINT TRIGGER"));
  assert.doesNotMatch(functionBody, /\b(UPDATE|INSERT|DELETE)\b/);
});

test("asset audit foundation contains no storage or authentication secrets", async () => {
  const schema = await readFile("prisma/schema.prisma", "utf8");
  const audit = schema.slice(schema.indexOf("model ResourceAssetAudit"), schema.indexOf("model ResourceTeacher"));
  assert.match(audit, /resourceVersionBefore/);
  assert.match(audit, /progressRowsClamped/);
  assert.doesNotMatch(audit, /objectKey|provider|signedUrl|contentUrl|externalUrl|session|password|originalFileName/i);
});

test("protected PDF delivery routes resolve the active pointer after authorization", async () => {
  for (const route of ["admin", "student", "teacher"]) {
    const source = await readFile(`app/api/${route}/resources/[resourceId]/asset/route.ts`, "utf8");
    assert.match(source, /activeAssetId:\s*true/);
    assert.match(source, /activeAsset:/);
    assert.match(source, /resolveActiveAsset\(resource\)/);
    assert.ok(source.indexOf("resolveActiveAsset(resource)") > source.indexOf("require"), `${route} route resolves only after authorization`);
  }
});
