import assert from "node:assert/strict";
import test from "node:test";

import "./helpers/server-only";

import {
  createRateLimitAdapter,
  createOpaqueRateLimitKey,
  MemoryRateLimitAdapter,
  RATE_LIMIT_POLICIES,
  RATE_LIMIT_POLICY_NAMES,
  rateLimitedActionResult,
  rateLimitResponse,
} from "@/lib/rate-limit";

const expectedPolicies = {
  "login-ip": [20, 600_000, "closed"],
  "login-identity": [5, 900_000, "closed"],
  "login-email": [10, 3_600_000, "closed"],
  "signup-ip": [5, 3_600_000, "closed"],
  "signup-email": [3, 86_400_000, "closed"],
  "resource-create-user": [10, 600_000, "closed"],
  "resource-create-ip": [30, 3_600_000, "closed"],
  "pdf-upload-user": [3, 600_000, "closed"],
  "pdf-upload-ip": [10, 3_600_000, "closed"],
  "bookmark-user": [60, 60_000, "open"],
  "progress-user": [120, 600_000, "open"],
  "progress-resource": [30, 60_000, "open"],
  "teacher-mutation-user": [15, 60_000, "closed"],
  "teacher-resource-action": [3, 60_000, "closed"],
  "admin-mutation-user": [10, 60_000, "closed"],
  "admin-resource-action": [2, 10_000, "closed"],
} as const;

test("every required policy has the expected limit, window and failure mode", () => {
  assert.deepEqual([...RATE_LIMIT_POLICY_NAMES].sort(), Object.keys(expectedPolicies).sort());
  for (const [name, [limit, windowMs, failureMode]] of Object.entries(expectedPolicies)) {
    assert.deepEqual(RATE_LIMIT_POLICIES[name as keyof typeof RATE_LIMIT_POLICIES], {
      algorithm: name.startsWith("login-") || name.startsWith("signup-")
        ? "sliding-window"
        : "fixed-window",
      limit,
      windowMs,
      failureMode,
    });
  }
});

test("opaque keys are deterministic, canonicalized and contain no raw identifiers", () => {
  const secret = "fixed-test-secret";
  const first = createOpaqueRateLimitKey("login-email", "  Student@Example.COM ", secret);
  const second = createOpaqueRateLimitKey("login-email", "student@example.com", secret);
  const other = createOpaqueRateLimitKey("login-email", "other@example.com", secret);
  const ip = createOpaqueRateLimitKey("login-ip", "203.0.113.9", secret);

  assert.equal(first, second);
  assert.notEqual(first, other);
  assert.match(first, /^vk:rl:v1:login-email:[a-f0-9]{64}$/);
  assert.doesNotMatch(first, /student|example|@/i);
  assert.doesNotMatch(ip, /203\.0\.113\.9/);
  assert.throws(() => createOpaqueRateLimitKey("login-email", " ", secret));
  assert.throws(() => createOpaqueRateLimitKey("login-email", "student@example.com", ""));
});

test("memory adapter allows through the limit and then blocks", async () => {
  let now = 1_000;
  const adapter = new MemoryRateLimitAdapter({ secret: "test-secret", clock: () => now });
  assert.equal((await adapter.check("admin-resource-action", "admin:resource:approve")).remaining, 1);
  const finalAllowed = await adapter.check("admin-resource-action", "admin:resource:approve");
  assert.deepEqual(finalAllowed, { allowed: true, limit: 2, remaining: 0, retryAfterSeconds: 10 });
  const blocked = await adapter.check("admin-resource-action", "admin:resource:approve");
  assert.deepEqual(blocked, { allowed: false, limit: 2, remaining: 0, retryAfterSeconds: 10, reason: "limited" });
  now += 1;
  assert.equal((await adapter.check("admin-resource-action", "admin:resource:approve")).retryAfterSeconds, 10);
});

test("memory adapter supports weighted cost, expiry, reset and deterministic clocks", async () => {
  let now = 5_000;
  const adapter = new MemoryRateLimitAdapter({ secret: "test-secret", clock: () => now });
  const weighted = await adapter.check("pdf-upload-user", "teacher-1", 2);
  assert.equal(weighted.remaining, 1);
  assert.equal((await adapter.check("pdf-upload-user", "teacher-1", 2)).allowed, false);
  assert.equal((await adapter.check("pdf-upload-user", "teacher-1")).allowed, true);

  await adapter.reset("pdf-upload-user", "teacher-1");
  assert.equal((await adapter.check("pdf-upload-user", "teacher-1", 3)).allowed, true);
  now += 600_000;
  const expired = await adapter.check("pdf-upload-user", "teacher-1");
  assert.equal(expired.allowed, true);
  assert.equal(expired.remaining, 2);

  adapter.resetAllForTests();
  assert.equal((await adapter.check("pdf-upload-user", "teacher-1")).remaining, 2);
  await assert.rejects(() => adapter.check("pdf-upload-user", "teacher-1", 0));
});

test("production cannot select the memory adapter", () => {
  assert.throws(
    () => createRateLimitAdapter({ NODE_ENV: "production", RATE_LIMIT_ADAPTER: "memory", RATE_LIMIT_KEY_SECRET: "secret" }),
    /must be upstash in production/,
  );
  assert.doesNotThrow(() =>
    createRateLimitAdapter({ NODE_ENV: "test", RATE_LIMIT_ADAPTER: "memory", RATE_LIMIT_KEY_SECRET: "0123456789abcdef0123456789abcdef", RATE_LIMIT_TRUSTED_PROXY: "test" }),
  );
});

test("route response is a private 429 with Retry-After and a fixed safe body", async () => {
  const response = rateLimitResponse({ retryAfterSeconds: 12.2 });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "13");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), { error: "Too many requests. Please try again later." });
});

test("server-action result is sanitized", () => {
  const serialized = JSON.stringify(rateLimitedActionResult({ retryAfterSeconds: 8 }));
  assert.deepEqual(JSON.parse(serialized), {
    ok: false,
    code: "RATE_LIMITED",
    message: "Too many requests. Please try again later.",
    retryAfterSeconds: 8,
  });
  assert.doesNotMatch(serialized, /student@example|203\.0\.113|redis|provider|identifier|key/i);
});
