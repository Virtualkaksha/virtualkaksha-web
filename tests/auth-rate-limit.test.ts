import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import "./helpers/server-only";

import { authorizeCredentials, DUMMY_PASSWORD_HASH, resolveCredentialsClientIp } from "@/lib/auth/credentials-authentication";
import { registerStudentAccount } from "@/lib/auth/signup-service";
import type { RateLimitAdapter, RateLimitDecision, RateLimitPolicy } from "@/lib/rate-limit";

const allowed: RateLimitDecision = { allowed: true, limit: 10, remaining: 9, retryAfterSeconds: 0 };
const limited: RateLimitDecision = { allowed: false, limit: 5, remaining: 0, retryAfterSeconds: 60, reason: "limited" };
const request = new Request("https://virtual.test/api/auth/callback/credentials");
const ip = { ok: true as const, address: "203.0.113.9" };
const activeUser = {
  id: "user-1", email: "person@example.com", firstName: "Person", lastName: null,
  displayName: "Person", avatarUrl: null, passwordHash: "real-password-hash", status: "ACTIVE",
  sessionVersion: 1,
  roles: [{ role: { name: "STUDENT" } }],
};

const localDirectEnvironment = {
  NODE_ENV: "development",
  RATE_LIMIT_ADAPTER: "memory",
  RATE_LIMIT_KEY_SECRET: "0123456789abcdef0123456789abcdef",
  RATE_LIMIT_TRUSTED_PROXY: "direct",
  RATE_LIMIT_ENV_PREFIX: "local-development",
};

function adapter(options: { decision?: (policy: RateLimitPolicy) => RateLimitDecision; fail?: boolean } = {}) {
  const checks: Array<{ policy: RateLimitPolicy; identifier: string }> = [];
  const resets: Array<{ policy: RateLimitPolicy; identifier: string }> = [];
  const value: RateLimitAdapter = {
    check: async (policy, identifier) => {
      checks.push({ policy, identifier });
      if (options.fail) throw new Error("backend secret");
      return options.decision?.(policy) ?? allowed;
    },
    reset: async (policy, identifier) => { resets.push({ policy, identifier }); },
  };
  return { value, checks, resets };
}

async function login(options: {
  user?: typeof activeUser | null;
  matches?: boolean;
  limiter?: ReturnType<typeof adapter>;
}) {
  const comparedHashes: string[] = [];
  const limiter = options.limiter ?? adapter();
  const result = await authorizeCredentials(
    { email: " Person@Example.com ", password: "Password1", expectedRole: "STUDENT" },
    request,
    {
      rateLimit: limiter.value,
      resolveIp: () => ip,
      findUser: async () => (options.user === undefined ? activeUser : options.user) as never,
      comparePassword: async (_password, hash) => { comparedHashes.push(hash); return options.matches ?? true; },
      recordLogin: async () => undefined,
    },
  );
  return { result, comparedHashes, limiter };
}

test("unknown email, wrong password, inactive account and limited identity are visibly identical", async () => {
  const unknown = await login({ user: null });
  const wrong = await login({ matches: false });
  const inactive = await login({ user: { ...activeUser, status: "SUSPENDED" } });
  const blockedLimiter = adapter({ decision: (policy) => policy === "login-identity" ? limited : allowed });
  const blocked = await login({ limiter: blockedLimiter });
  assert.deepEqual([unknown.result, wrong.result, inactive.result, blocked.result], [null, null, null, null]);
});

test("missing and inactive users receive exactly one dummy bcrypt comparison", async () => {
  for (const user of [null, { ...activeUser, status: "SUSPENDED" }]) {
    const result = await login({ user });
    assert.deepEqual(result.comparedHashes, [DUMMY_PASSWORD_HASH]);
  }
});

test("direct credentials authorization checks all login policies with normalized identifiers", async () => {
  const result = await login({});
  assert.deepEqual(result.limiter.checks.map(({ policy }) => policy), ["login-ip", "login-identity", "login-email"]);
  assert.equal(result.limiter.checks[0].identifier, "203.0.113.9");
  assert.equal(result.limiter.checks[1].identifier, "203.0.113.9\u0000person@example.com");
  assert.equal(result.limiter.checks[2].identifier, "person@example.com");
});

test("local memory credentials use a server-controlled loopback address and reach the real comparison", async () => {
  const limiter = adapter();
  const comparedHashes: string[] = [];
  const result = await authorizeCredentials(
    { email: "person@example.com", password: "NotARealTestPassword1", expectedRole: "STUDENT" },
    request,
    {
      environment: localDirectEnvironment,
      rateLimit: limiter.value,
      findUser: async () => activeUser as never,
      comparePassword: async (_password, hash) => {
        comparedHashes.push(hash);
        return false;
      },
    },
  );
  assert.equal(result, null);
  assert.deepEqual(comparedHashes, [activeUser.passwordHash]);
  assert.equal(limiter.checks[0].identifier, "127.0.0.1");
});

test("credentials loopback fallback is narrow and forwarded headers cannot spoof direct mode", () => {
  const spoofed = new Request(request, { headers: { "x-forwarded-for": "203.0.113.55" } });
  assert.deepEqual(resolveCredentialsClientIp(spoofed, localDirectEnvironment), {
    ok: true,
    address: "127.0.0.1",
  });

  const productionDirect = {
    ...localDirectEnvironment,
    NODE_ENV: "production",
    RATE_LIMIT_ADAPTER: "upstash",
    UPSTASH_REDIS_REST_URL: "https://redis.example.test",
    UPSTASH_REDIS_REST_TOKEN: "test-token",
  };
  assert.deepEqual(resolveCredentialsClientIp(spoofed, productionDirect), {
    ok: false,
    code: "MISSING_IP",
    message: "A trusted client address is unavailable.",
  });
});

test("credentials preserve Vercel trusted-proxy behavior and fail closed without configuration", () => {
  const forwarded = new Request(request, { headers: { "x-forwarded-for": "203.0.113.10, 198.51.100.1" } });
  assert.deepEqual(resolveCredentialsClientIp(forwarded, {
    ...localDirectEnvironment,
    NODE_ENV: "test",
    RATE_LIMIT_TRUSTED_PROXY: "vercel",
  }), { ok: true, address: "203.0.113.10" });
  assert.equal(resolveCredentialsClientIp(request, { NODE_ENV: "development" }).ok, false);
});

test("successful login resets identity and email buckets but not the IP bucket", async () => {
  const result = await login({});
  assert.equal(result.result?.id, "user-1");
  assert.equal(result.result?.sessionVersion, 1);
  assert.deepEqual(result.limiter.resets.map(({ policy }) => policy), ["login-identity", "login-email"]);
  assert.equal(result.limiter.resets.some(({ policy }) => policy === "login-ip"), false);
});

test("limiter outage and missing trusted IP fail login closed without leaking details", async () => {
  const outage = await login({ limiter: adapter({ fail: true }) });
  assert.equal(outage.result, null);
  assert.doesNotMatch(JSON.stringify(outage.result), /person@example|203\.0\.113|backend|secret/i);
  const missingIp = await authorizeCredentials(
    { email: "person@example.com", password: "Password1", expectedRole: "STUDENT" }, request,
    { resolveIp: () => ({ ok: false, code: "MISSING_IP", message: "missing" }), comparePassword: async () => false },
  );
  assert.equal(missingIp, null);
});

test("signup IP and normalized-email limits are enforced before hashing", async () => {
  for (const blockedPolicy of ["signup-ip", "signup-email"] as const) {
    let hashed = false;
    const limiter = adapter({ decision: (policy) => policy === blockedPolicy ? limited : allowed });
    const result = await registerStudentAccount(
      { firstName: "Person", email: "person@example.com", password: "Password1", request },
      { rateLimit: limiter.value, resolveIp: () => ip, hash: async () => { hashed = true; return "hash"; } },
    );
    assert.deepEqual(result, { accepted: false, retryAfterSeconds: 60 });
    assert.equal(hashed, false);
  }
});

test("new and duplicate signup emails have the same accepted result", async () => {
  const base = { rateLimit: adapter().value, resolveIp: () => ip, hash: async () => "hash" };
  const created = await registerStudentAccount(
    { firstName: "Person", email: "person@example.com", password: "Password1", request },
    { ...base, createUser: async () => ({ id: "user-1", email: "person@example.com" }) },
  );
  const duplicate = await registerStudentAccount(
    { firstName: "Person", email: "person@example.com", password: "Password1", request },
    { ...base, createUser: async () => { throw new Error("database uniqueness details"); }, isUniqueConflict: () => true },
  );
  assert.deepEqual(created, { accepted: true });
  assert.deepEqual(duplicate, created);
  assert.doesNotMatch(JSON.stringify(duplicate), /unique|database|prisma|person@example/i);
});

test("signup limiter outage fails closed before hashing or creation", async () => {
  let touched = false;
  const result = await registerStudentAccount(
    { firstName: "Person", email: "person@example.com", password: "Password1", request },
    {
      rateLimit: adapter({ fail: true }).value,
      resolveIp: () => ip,
      hash: async () => { touched = true; return "hash"; },
      createUser: async () => { touched = true; return { id: "user", email: "person@example.com" }; },
    },
  );
  assert.equal(result.accepted, false);
  assert.equal(touched, false);
});

test("signup uses the request IP helper that supports local direct mode", async () => {
  const source = await readFile(new URL("../lib/auth/signup-service.ts", import.meta.url), "utf8");
  assert.match(source, /resolveRequestClientIp/);
  assert.doesNotMatch(source, /resolveTrustedClientIp\(\{\s*request\s*\}\)/);
});
