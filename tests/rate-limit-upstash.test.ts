import assert from "node:assert/strict";
import test from "node:test";

import "./helpers/server-only";

import {
  createRateLimitAdapter,
  createUpstashLimiters,
  createUpstashPrefix,
  getUpstashAlgorithm,
  RATE_LIMIT_POLICIES,
  RATE_LIMIT_POLICY_NAMES,
  resolveRateLimitAdapterName,
  UpstashRateLimitAdapter,
  validateUpstashEnvironment,
} from "@/lib/rate-limit";
import type { RateLimitAdapter, RateLimitPolicy } from "@/lib/rate-limit";
import type { UpstashLimiter } from "@/lib/rate-limit/upstash-adapter";

function limiterMap(limiter: UpstashLimiter) {
  return Object.fromEntries(RATE_LIMIT_POLICY_NAMES.map((policy) => [policy, limiter])) as Record<RateLimitPolicy, UpstashLimiter>;
}

const productionEnvironment = {
  NODE_ENV: "production",
  RATE_LIMIT_ADAPTER: "upstash",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "test-token",
  RATE_LIMIT_KEY_SECRET: "0123456789abcdef0123456789abcdef",
  RATE_LIMIT_TRUSTED_PROXY: "vercel",
  RATE_LIMIT_ENV_PREFIX: "production",
};

test("every policy maps to its configured Upstash algorithm, limit and window", () => {
  assert.equal(RATE_LIMIT_POLICY_NAMES.length, 18);
  const limiters = createUpstashLimiters({} as never, "test");
  assert.deepEqual(Object.keys(limiters).sort(), [...RATE_LIMIT_POLICY_NAMES].sort());
  for (const policy of RATE_LIMIT_POLICY_NAMES) {
    const config = RATE_LIMIT_POLICIES[policy];
    assert.equal(getUpstashAlgorithm(policy), config.algorithm);
    assert.ok(config.limit > 0);
    assert.ok(config.windowMs > 0);
    assert.equal(
      config.algorithm,
      policy.startsWith("login-") || policy.startsWith("signup-")
        ? "sliding-window"
        : "fixed-window",
    );
    assert.equal(typeof limiters[policy].limit, "function");
    assert.equal(typeof limiters[policy].resetUsedTokens, "function");
  }
});

test("production selects Upstash lazily and development or test may select memory", () => {
  assert.equal(resolveRateLimitAdapterName(productionEnvironment), "upstash");
  assert.equal(resolveRateLimitAdapterName({ ...productionEnvironment, NODE_ENV: "development", RATE_LIMIT_ADAPTER: "memory", RATE_LIMIT_TRUSTED_PROXY: "direct" }), "memory");
  assert.equal(resolveRateLimitAdapterName({ ...productionEnvironment, NODE_ENV: "test", RATE_LIMIT_ADAPTER: "memory", RATE_LIMIT_TRUSTED_PROXY: "test" }), "memory");

  const sentinel = { check: async () => { throw new Error("unused"); }, reset: async () => undefined } satisfies RateLimitAdapter;
  let created = 0;
  const selected = createRateLimitAdapter(productionEnvironment, {
    createUpstash: () => { created += 1; return sentinel; },
  });
  assert.equal(selected, sentinel);
  assert.equal(created, 1);
});

test("production rejects memory and missing or unsafe Upstash configuration", () => {
  assert.throws(
    () => resolveRateLimitAdapterName({ NODE_ENV: "production", RATE_LIMIT_ADAPTER: "memory" }),
    /must be upstash in production/,
  );
  assert.throws(
    () => resolveRateLimitAdapterName({ NODE_ENV: "test", RATE_LIMIT_ADAPTER: "unknown" }),
    /must be memory or upstash/,
  );
  for (const missing of [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "RATE_LIMIT_KEY_SECRET",
    "RATE_LIMIT_TRUSTED_PROXY",
  ] as const) {
    assert.throws(
      () => validateUpstashEnvironment({ ...productionEnvironment, [missing]: "" }),
      new RegExp(missing),
    );
  }
  assert.throws(
    () => validateUpstashEnvironment({ ...productionEnvironment, UPSTASH_REDIS_REST_URL: "not-a-url" }),
    /must be a valid absolute HTTP\(S\) URL/,
  );
  assert.throws(
    () => validateUpstashEnvironment({ ...productionEnvironment, RATE_LIMIT_TRUSTED_PROXY: "test" }),
    /may be test only/,
  );
});

test("module import is lazy and first factory selection validates configuration", () => {
  assert.equal(typeof createRateLimitAdapter, "function");
  assert.throws(() => resolveRateLimitAdapterName({ NODE_ENV: "production" }), /RATE_LIMIT_ADAPTER/);
  assert.throws(() => createRateLimitAdapter({ NODE_ENV: "production" }), /RATE_LIMIT_ADAPTER/);
});

test("checks and resets send only the same opaque identifier", async () => {
  const seenChecks: string[] = [];
  const seenResets: string[] = [];
  const fakeLimiter: UpstashLimiter = {
    limit: async (identifier) => {
      seenChecks.push(identifier);
      return { success: true, limit: 10, remaining: 9, reset: 20_000 };
    },
    resetUsedTokens: async (identifier) => { seenResets.push(identifier); },
  };
  const adapter = new UpstashRateLimitAdapter({
    secret: "fixed-secret",
    limiters: limiterMap(fakeLimiter),
    clock: () => 10_000,
  });
  await adapter.check("login-email", " Person@Example.com ");
  await adapter.reset("login-email", "person@example.com");

  assert.equal(seenChecks.length, 1);
  assert.deepEqual(seenResets, seenChecks);
  assert.match(seenChecks[0], /^vk:rl:v1:login-email:[a-f0-9]{64}$/);
  assert.doesNotMatch(seenChecks[0], /person|example|@/i);
});

test("cost is forwarded without exposing the raw identifier", async () => {
  let receivedRate = 0;
  let receivedIdentifier = "";
  const fakeLimiter: UpstashLimiter = {
    limit: async (identifier, options) => {
      receivedIdentifier = identifier;
      receivedRate = options?.rate ?? 0;
      return { success: true, limit: 10, remaining: 7, reset: 20_000 };
    },
    resetUsedTokens: async () => undefined,
  };
  const adapter = new UpstashRateLimitAdapter({ secret: "fixed-secret", limiters: limiterMap(fakeLimiter) });
  const result = await adapter.check("pdf-upload-ip", "203.0.113.44", 3);
  assert.equal(result.allowed, true);
  assert.equal(receivedRate, 3);
  assert.doesNotMatch(receivedIdentifier, /203\.0\.113\.44/);
});

test("backend errors and timeouts return sanitized backend-unavailable decisions", async () => {
  const failing: UpstashLimiter = {
    limit: async () => { throw new Error("token=test-token person@example.com"); },
    resetUsedTokens: async () => { throw new Error("test-token"); },
  };
  const failureAdapter = new UpstashRateLimitAdapter({ secret: "fixed-secret", limiters: limiterMap(failing), timeoutMs: 20 });
  const failed = await failureAdapter.check("login-ip", "203.0.113.8");
  assert.deepEqual(failed, {
    allowed: false,
    limit: 20,
    remaining: 0,
    retryAfterSeconds: 1,
    reason: "backend-unavailable",
  });
  assert.doesNotMatch(JSON.stringify(failed), /test-token|person|203\.0\.113|upstash|redis/i);
  await assert.rejects(() => failureAdapter.reset("login-ip", "203.0.113.8"), /^Error: Rate-limit backend is unavailable\.$/);

  const hanging: UpstashLimiter = {
    limit: async () => new Promise(() => undefined),
    resetUsedTokens: async () => new Promise(() => undefined),
  };
  const timeoutAdapter = new UpstashRateLimitAdapter({ secret: "fixed-secret", limiters: limiterMap(hanging), timeoutMs: 5 });
  assert.equal((await timeoutAdapter.check("signup-ip", "203.0.113.9")).reason, "backend-unavailable");
});

test("environment prefixes isolate Upstash namespaces", () => {
  const production = createUpstashPrefix("login-ip", "production");
  const staging = createUpstashPrefix("login-ip", "staging");
  assert.notEqual(production, staging);
  assert.equal(production, "vk:rl:production:login-ip");
  assert.equal(staging, "vk:rl:staging:login-ip");
  assert.equal(validateUpstashEnvironment(productionEnvironment).environmentPrefix, "production");
  assert.throws(
    () => validateUpstashEnvironment({ ...productionEnvironment, RATE_LIMIT_ENV_PREFIX: "bad prefix!" }),
    /RATE_LIMIT_ENV_PREFIX/,
  );
});
