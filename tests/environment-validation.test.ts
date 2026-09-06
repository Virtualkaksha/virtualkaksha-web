import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import "./helpers/server-only";

type EnvironmentModule = typeof import("@/lib/env");
let environmentModule: EnvironmentModule;
let getAuthEnvironment: EnvironmentModule["getAuthEnvironment"];
let getCommonEnvironment: EnvironmentModule["getCommonEnvironment"];
let getDatabaseEnvironment: EnvironmentModule["getDatabaseEnvironment"];
let getRateLimitEnvironment: EnvironmentModule["getRateLimitEnvironment"];
let getStorageEnvironment: EnvironmentModule["getStorageEnvironment"];
let resetAuthEnvironmentCacheForTests: EnvironmentModule["resetAuthEnvironmentCacheForTests"];
let resetCommonEnvironmentCacheForTests: EnvironmentModule["resetCommonEnvironmentCacheForTests"];
let resetDatabaseEnvironmentCacheForTests: EnvironmentModule["resetDatabaseEnvironmentCacheForTests"];
let resetRateLimitEnvironmentCacheForTests: EnvironmentModule["resetRateLimitEnvironmentCacheForTests"];
let resetStorageEnvironmentCacheForTests: EnvironmentModule["resetStorageEnvironmentCacheForTests"];

const strongSecret = "0123456789abcdef0123456789abcdef";
const productionAuth = {
  NODE_ENV: "production",
  AUTH_SECRET: strongSecret,
  AUTH_URL: "https://virtualkaksha.test",
  AUTH_TRUST_HOST: "true",
};
const productionStorage = {
  NODE_ENV: "production",
  RESOURCE_STORAGE_PROVIDER: "s3",
  RESOURCE_UPLOAD_MAX_MB: "20",
  S3_ENDPOINT: "https://objects.storage.test",
  S3_REGION: "auto",
  S3_BUCKET: "private-resources",
  S3_ACCESS_KEY_ID: "storage-access-key",
  S3_SECRET_ACCESS_KEY: "storage-secret-key",
  S3_FORCE_PATH_STYLE: "false",
};
const productionRateLimit = {
  NODE_ENV: "production",
  RATE_LIMIT_ADAPTER: "upstash",
  RATE_LIMIT_KEY_SECRET: strongSecret,
  RATE_LIMIT_TRUSTED_PROXY: "vercel",
  RATE_LIMIT_ENV_PREFIX: "production",
  UPSTASH_REDIS_REST_URL: "https://redis.upstash.test",
  UPSTASH_REDIS_REST_TOKEN: "upstash-token-value",
};

function resetAll() {
  resetCommonEnvironmentCacheForTests();
  resetDatabaseEnvironmentCacheForTests();
  resetAuthEnvironmentCacheForTests();
  resetStorageEnvironmentCacheForTests();
  resetRateLimitEnvironmentCacheForTests();
}

test.before(async () => {
  environmentModule = await import("@/lib/env");
  ({
    getAuthEnvironment,
    getCommonEnvironment,
    getDatabaseEnvironment,
    getRateLimitEnvironment,
    getStorageEnvironment,
    resetAuthEnvironmentCacheForTests,
    resetCommonEnvironmentCacheForTests,
    resetDatabaseEnvironmentCacheForTests,
    resetRateLimitEnvironmentCacheForTests,
    resetStorageEnvironmentCacheForTests,
  } = environmentModule);
});

test.beforeEach(resetAll);

test("environment modules import lazily without production secrets", async () => {
  assert.ok(environmentModule);
  assert.equal(typeof getDatabaseEnvironment, "function");
});

test("common environment is strict and exposes safe helpers", () => {
  assert.deepEqual(getCommonEnvironment({ NODE_ENV: "test" }), {
    nodeEnv: "test",
    isProduction: false,
    isDevelopment: false,
    isTest: true,
  });
  resetCommonEnvironmentCacheForTests();
  assert.throws(() => getCommonEnvironment({ NODE_ENV: "staging" }), /NODE_ENV.*development, test, or production/);
  resetCommonEnvironmentCacheForTests();
  assert.throws(() => getCommonEnvironment({}), /NODE_ENV/);
});

test("database validates independently and production requires a PostgreSQL URL", () => {
  assert.deepEqual(getDatabaseEnvironment({ NODE_ENV: "test" }), { nodeEnv: "test" });
  resetDatabaseEnvironmentCacheForTests();
  assert.equal(
    getDatabaseEnvironment({ NODE_ENV: "production", DATABASE_URL: "postgresql://user:pass@db.internal/app" }).databaseUrl,
    "postgresql://user:pass@db.internal/app",
  );
  resetDatabaseEnvironmentCacheForTests();
  assert.throws(() => getDatabaseEnvironment({ NODE_ENV: "production" }), /DATABASE_URL.*required/);
  for (const DATABASE_URL of ["not-a-url", "mysql://db.internal/app", "postgresql:///app", "postgresql://db.internal"] ) {
    resetDatabaseEnvironmentCacheForTests();
    assert.throws(() => getDatabaseEnvironment({ NODE_ENV: "test", DATABASE_URL }), /DATABASE_URL/);
  }
});

test("database errors name variables without leaking their values", () => {
  const sensitiveValue = "postgresql://private-user:private-password@replace-me/private-db";
  assert.throws(
    () => getDatabaseEnvironment({ NODE_ENV: "production", DATABASE_URL: sensitiveValue }),
    (error) => error instanceof Error && error.message.includes("DATABASE_URL") && !error.message.includes(sensitiveValue),
  );
});

test("auth enforces production secrets, HTTPS and strict trusted-host booleans", () => {
  assert.deepEqual(getAuthEnvironment(productionAuth), {
    nodeEnv: "production",
    authSecret: strongSecret,
    authUrl: "https://virtualkaksha.test/",
    authTrustHost: true,
  });
  for (const environment of [
    { NODE_ENV: "production", AUTH_URL: productionAuth.AUTH_URL, AUTH_TRUST_HOST: "true" },
    { NODE_ENV: "production", AUTH_SECRET: strongSecret, AUTH_TRUST_HOST: "true" },
    { ...productionAuth, AUTH_URL: "http://virtualkaksha.test" },
    { ...productionAuth, AUTH_TRUST_HOST: "yes" },
  ]) {
    resetAuthEnvironmentCacheForTests();
    assert.throws(() => getAuthEnvironment(environment), /AUTH_/);
  }
});

test("auth permits local HTTP only for loopback development and test URLs", () => {
  for (const AUTH_URL of ["http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000"]) {
    resetAuthEnvironmentCacheForTests();
    assert.equal(getAuthEnvironment({ NODE_ENV: "development", AUTH_URL }).authUrl, `${AUTH_URL}/`);
  }
  resetAuthEnvironmentCacheForTests();
  assert.throws(
    () => getAuthEnvironment({ NODE_ENV: "development", AUTH_URL: "http://dev.internal" }),
    /AUTH_URL.*localhost/,
  );
});

test("auth rejects undersized and placeholder secrets without exposing them", () => {
  for (const AUTH_SECRET of ["too-short", "replace-me-with-a-long-secret-value"]) {
    resetAuthEnvironmentCacheForTests();
    assert.throws(
      () => getAuthEnvironment({ NODE_ENV: "test", AUTH_SECRET }),
      (error) => error instanceof Error && error.message.includes("AUTH_SECRET") && !error.message.includes(AUTH_SECRET),
    );
  }
});

test("storage permits documented local development and enforces upload bounds", () => {
  assert.deepEqual(getStorageEnvironment({
    NODE_ENV: "development",
    RESOURCE_STORAGE_PROVIDER: "local",
    LOCAL_RESOURCE_STORAGE_PATH: "./storage/resources",
  }), {
    nodeEnv: "development",
    provider: "local",
    uploadMaxMb: 20,
    localPath: "./storage/resources",
  });
  for (const RESOURCE_UPLOAD_MAX_MB of ["0", "21", "1.5", "invalid"]) {
    resetStorageEnvironmentCacheForTests();
    assert.throws(() => getStorageEnvironment({
      NODE_ENV: "test",
      RESOURCE_STORAGE_PROVIDER: "local",
      LOCAL_RESOURCE_STORAGE_PATH: "./storage/resources",
      RESOURCE_UPLOAD_MAX_MB,
    }), /RESOURCE_UPLOAD_MAX_MB/);
  }
});

test("storage rejects local production and conditionally requires valid S3 configuration", () => {
  assert.throws(() => getStorageEnvironment({
    NODE_ENV: "production",
    RESOURCE_STORAGE_PROVIDER: "local",
    LOCAL_RESOURCE_STORAGE_PATH: "./storage/resources",
  }), /RESOURCE_STORAGE_PROVIDER.*s3/);
  resetStorageEnvironmentCacheForTests();
  assert.throws(() => getStorageEnvironment({
    NODE_ENV: "test",
    RESOURCE_STORAGE_PROVIDER: "s3",
  }), /S3_ENDPOINT/);
  resetStorageEnvironmentCacheForTests();
  assert.equal(getStorageEnvironment(productionStorage).provider, "s3");
  resetStorageEnvironmentCacheForTests();
  assert.throws(() => getStorageEnvironment({ ...productionStorage, S3_ENDPOINT: "http://objects.storage.test" }), /S3_ENDPOINT.*HTTPS/);
  resetStorageEnvironmentCacheForTests();
  assert.throws(() => getStorageEnvironment({ ...productionStorage, S3_FORCE_PATH_STYLE: "0" }), /S3_FORCE_PATH_STYLE/);
});

test("non-production S3 permits HTTP while retaining conditional field validation", () => {
  const result = getStorageEnvironment({
    ...productionStorage,
    NODE_ENV: "test",
    S3_ENDPOINT: "http://localhost:9000",
  });
  assert.equal(result.provider, "s3");
  assert.equal(result.endpoint, "http://localhost:9000/");
});

test("rate limiting rejects memory and HTTP Upstash in production", () => {
  assert.equal(getRateLimitEnvironment(productionRateLimit).adapter, "upstash");
  resetRateLimitEnvironmentCacheForTests();
  assert.throws(() => getRateLimitEnvironment({ ...productionRateLimit, RATE_LIMIT_ADAPTER: "memory" }), /RATE_LIMIT_ADAPTER.*upstash/);
  resetRateLimitEnvironmentCacheForTests();
  assert.throws(() => getRateLimitEnvironment({ ...productionRateLimit, UPSTASH_REDIS_REST_URL: "http://redis.upstash.test" }), /UPSTASH_REDIS_REST_URL.*HTTPS/);
});

test("rate limiting enforces conditional Upstash, proxy and prefix rules", () => {
  assert.equal(getRateLimitEnvironment({
    NODE_ENV: "test",
    RATE_LIMIT_KEY_SECRET: strongSecret,
    RATE_LIMIT_TRUSTED_PROXY: "test",
  }).adapter, "memory");
  resetRateLimitEnvironmentCacheForTests();
  assert.throws(() => getRateLimitEnvironment({
    NODE_ENV: "development",
    RATE_LIMIT_KEY_SECRET: strongSecret,
    RATE_LIMIT_TRUSTED_PROXY: "test",
  }), /RATE_LIMIT_TRUSTED_PROXY/);
  resetRateLimitEnvironmentCacheForTests();
  assert.throws(() => getRateLimitEnvironment({
    NODE_ENV: "test",
    RATE_LIMIT_ADAPTER: "upstash",
    RATE_LIMIT_KEY_SECRET: strongSecret,
    RATE_LIMIT_TRUSTED_PROXY: "direct",
  }), /UPSTASH_REDIS_REST_URL/);
  resetRateLimitEnvironmentCacheForTests();
  assert.throws(() => getRateLimitEnvironment({
    NODE_ENV: "test",
    RATE_LIMIT_KEY_SECRET: strongSecret,
    RATE_LIMIT_TRUSTED_PROXY: "direct",
    RATE_LIMIT_ENV_PREFIX: "Invalid Prefix!",
  }), /RATE_LIMIT_ENV_PREFIX/);
});

test("rate-limit secrets and tokens reject placeholders without leaking values", () => {
  for (const environment of [
    { ...productionRateLimit, RATE_LIMIT_KEY_SECRET: "replace-me-with-a-long-secret-value" },
    { ...productionRateLimit, UPSTASH_REDIS_REST_TOKEN: "placeholder-token" },
  ]) {
    resetRateLimitEnvironmentCacheForTests();
    const sensitiveValue = environment.RATE_LIMIT_KEY_SECRET === productionRateLimit.RATE_LIMIT_KEY_SECRET
      ? environment.UPSTASH_REDIS_REST_TOKEN
      : environment.RATE_LIMIT_KEY_SECRET;
    assert.throws(
      () => getRateLimitEnvironment(environment),
      (error) => error instanceof Error && !error.message.includes(sensitiveValue),
    );
  }
});

test("successful subsystem results are cached and test resets replace them", () => {
  const source = { NODE_ENV: "test", DATABASE_URL: "postgresql://user:pass@db.internal/first" };
  const first = getDatabaseEnvironment(source);
  source.DATABASE_URL = "postgresql://user:pass@db.internal/second";
  assert.equal(getDatabaseEnvironment(source), first);
  assert.match(getDatabaseEnvironment(source).databaseUrl ?? "", /first/);
  resetDatabaseEnvironmentCacheForTests();
  assert.match(getDatabaseEnvironment(source).databaseUrl ?? "", /second/);
});

test("Prisma import is lazy, first use validates safely, and development caches the client", async () => {
  const databaseSecret = "postgresql://sensitive-user:sensitive-password@db.internal/virtualkaksha";
  const prismaModule = await import("@/lib/prisma");
  assert.equal(typeof prismaModule.getPrismaClient, "function");

  prismaModule.resetPrismaClientForTests();
  assert.throws(
    () => prismaModule.getPrismaClient({ NODE_ENV: "production", DATABASE_URL: "not-a-database-url" }),
    (error) => error instanceof Error && !error.message.includes("not-a-database-url"),
  );

  prismaModule.resetPrismaClientForTests();
  let creations = 0;
  // The stub must expose the delegates the staleness probe checks, or the cache is
  // treated as a stale hot-reload client and rebuilt.
  const sentinel = {
    user: { findUnique: () => undefined },
    resource: { findUnique: () => undefined },
    teacherAccessRequest: { findUnique: () => undefined },
  };
  const dependencies = {
    createClient: () => {
      creations += 1;
      return sentinel as never;
    },
  };
  const first = prismaModule.getPrismaClient(
    { NODE_ENV: "development", DATABASE_URL: databaseSecret },
    dependencies,
  );
  const second = prismaModule.getPrismaClient(
    { NODE_ENV: "development", DATABASE_URL: databaseSecret },
    dependencies,
  );
  assert.equal(first, sentinel);
  assert.equal(second, sentinel);
  assert.equal(creations, 1);
});

test("validated Auth.js values reach one lazy runtime config without leaking invalid secrets", async () => {
  const { authConfig, createAuthRuntimeConfig } = await import("@/auth.config");
  const runtime = createAuthRuntimeConfig({
    NODE_ENV: "production",
    AUTH_SECRET: strongSecret,
    AUTH_URL: "https://virtualkaksha.test/custom/auth",
    AUTH_TRUST_HOST: "false",
  });
  assert.equal(runtime.secret, strongSecret);
  assert.equal(runtime.trustHost, false);
  assert.equal(runtime.basePath, "/custom/auth");
  assert.equal(runtime.callbacks, authConfig.callbacks);
  assert.deepEqual(runtime.providers, []);

  const invalidSecret = "visible-but-invalid";
  assert.throws(
    () => createAuthRuntimeConfig({
      NODE_ENV: "production",
      AUTH_SECRET: invalidSecret,
      AUTH_URL: "https://virtualkaksha.test",
      AUTH_TRUST_HOST: "true",
    }),
    (error) => error instanceof Error && !error.message.includes(invalidSecret),
  );
  assert.equal(createAuthRuntimeConfig({ NODE_ENV: "development" }).basePath, "/api/auth");
});

test("client-facing modules do not import server environment accessors", async () => {
  for (const file of [
    "app/components/auth/LoginForm.tsx",
    "app/teacher/resources/ResourceCreateForm.tsx",
    "components/student/StudentPdfViewer.tsx",
    "components/student/BookmarkButton.tsx",
  ]) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /@\/lib\/env|process\.env|DATABASE_URL|AUTH_SECRET|UPSTASH_REDIS|S3_SECRET/);
  }
});

test("every environment module is server-only and none exports process.env", async () => {
  for (const file of ["common", "auth", "database", "storage", "rate-limit", "index"]) {
    const source = await readFile(`lib/env/${file}.ts`, "utf8");
    assert.match(source, /^import "server-only";/);
    assert.doesNotMatch(source, /export\s+(?:const|let|var|default).*process\.env/);
    assert.doesNotMatch(source, /NEXT_PUBLIC_/);
  }
});
