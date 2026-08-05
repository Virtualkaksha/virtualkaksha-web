import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import "./helpers/server-only";

import { handleResourceImportPreview } from "@/app/api/admin/resources/import/preview/route";
import type { RateLimitAdapter } from "@/lib/rate-limit";
function request(origin = "https://virtual.test") { return new Request("https://virtual.test/api/admin/resources/import/preview", { method: "POST", headers: { origin, host: "virtual.test", "content-type": "multipart/form-data; boundary=test" } }); }
const admin = async () => ({ ok: true, identity: { id: "admin-1", roles: ["ADMIN"], sessionVersion: 2 } } satisfies import("@/lib/auth/current-identity").CurrentIdentityResult);

test("same-origin, fresh ADMIN, trusted IP and limits run before multipart parsing", async () => {
  const events: string[] = [];
  const response = await handleResourceImportPreview(request(), {
    resolveIdentity: async () => { events.push("identity"); return admin(); },
    resolveIp: () => { events.push("ip"); return { ok: true, address: "127.0.0.1" }; },
    rateLimit: { check: async (policy) => { events.push(policy); return { allowed: true, limit: 10, remaining: 9, retryAfterSeconds: 60 }; }, reset: async () => undefined },
    parseFormData: async () => { events.push("multipart"); return new FormData(); },
  });
  assert.equal(response.status, 400);
  assert.deepEqual(events, ["identity", "ip", "admin-import-preview-user", "admin-import-preview-ip", "multipart"]);
  assert.equal((await handleResourceImportPreview(request("https://evil.test"), { resolveIdentity: admin })).status, 403);
});

test("unauthenticated, STUDENT, TEACHER and stale ADMIN are denied before upload parsing", async () => {
  for (const [code, status] of [["NO_SESSION", 401], ["FORBIDDEN", 403], ["STALE_SESSION", 401]] as const) {
    let parsed = false;
    const response = await handleResourceImportPreview(request(), { resolveIdentity: async () => ({ ok: false, code, message: "Access denied." }), parseFormData: async () => { parsed = true; return new FormData(); } });
    assert.equal(response.status, status); assert.equal(parsed, false);
  }
});

test("user/IP limits fail closed and raw identifiers do not appear in responses", async () => {
  for (const reason of ["limited", "backend-unavailable"] as const) {
    const limiter: RateLimitAdapter = { check: async () => ({ allowed: false, limit: 5, remaining: 0, retryAfterSeconds: 42, reason }), reset: async () => undefined };
    const response = await handleResourceImportPreview(request(), { resolveIdentity: admin, resolveIp: () => ({ ok: true, address: "203.0.113.8" }), rateLimit: limiter });
    assert.equal(response.status, reason === "limited" ? 429 : 503);
    assert.doesNotMatch(await response.text(), /admin-1|203\.0\.113\.8|redis|upstash|identifier|key/i);
  }
});

test("body type, content length, one-file and file-size checks are bounded", async () => {
  const base = { resolveIdentity: admin, resolveIp: () => ({ ok: true, address: "127.0.0.1" } as const), rateLimit: { check: async () => ({ allowed: true, limit: 10, remaining: 9, retryAfterSeconds: 60 }), reset: async () => undefined } satisfies RateLimitAdapter };
  const wrongType = new Request("https://virtual.test/api/admin/resources/import/preview", { method: "POST", headers: { origin: "https://virtual.test", host: "virtual.test", "content-type": "text/csv" } });
  assert.equal((await handleResourceImportPreview(wrongType, base)).status, 415);
  const oversized = new Request(request(), { headers: { origin: "https://virtual.test", host: "virtual.test", "content-type": "multipart/form-data; boundary=test", "content-length": String(3 * 1024 * 1024) } });
  assert.equal((await handleResourceImportPreview(oversized, base)).status, 413);
  const extra = new FormData(); extra.set("file", new File(["x"], "ignored.csv")); extra.set("other", "x");
  assert.equal((await handleResourceImportPreview(request(), { ...base, parseFormData: async () => extra })).status, 400);
  const tooLarge = new FormData(); tooLarge.set("file", new File([new Uint8Array(2 * 1024 * 1024 + 1)], "ignored.csv"));
  assert.equal((await handleResourceImportPreview(request(), { ...base, parseFormData: async () => tooLarge })).status, 413);
});

test("preview route and page expose no mutation path or sensitive storage metadata", async () => {
  const route = await readFile("app/api/admin/resources/import/preview/route.ts", "utf8");
  const page = await readFile("app/admin/resources/import/ResourceImportClient.tsx", "utf8");
  const repository = await readFile("repositories/admin-resource-import.repository.ts", "utf8");
  assert.match(page, /Preview only\. No resource will be changed\./);
  assert.doesNotMatch(page, />\s*(Apply|Confirm|Publish|Archive|Upload PDF|Replace file)\s*</i);
  assert.doesNotMatch(route + repository, /\.create\(|\.update\(|\.delete\(|\.upsert\(|revalidatePath|ResourceAsset|bookmark|progress|storage/i);
  assert.doesNotMatch(route, /filename|objectKey|contentUrl|externalUrl|provider|signed/i);
});
