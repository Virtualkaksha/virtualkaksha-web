import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

const secret = "0123456789abcdef0123456789abcdef";
const productionEnvironment = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://deployment-user:deployment-password@db.internal/virtualkaksha",
  AUTH_SECRET: secret,
  AUTH_URL: "https://virtualkaksha.test",
  AUTH_TRUST_HOST: "true",
  RESOURCE_STORAGE_PROVIDER: "s3",
  RESOURCE_UPLOAD_MAX_MB: "20",
  S3_ENDPOINT: "https://private-storage.test",
  S3_REGION: "auto",
  S3_BUCKET: "private-resources",
  S3_ACCESS_KEY_ID: "deployment-access-key",
  S3_SECRET_ACCESS_KEY: "deployment-storage-secret",
  S3_FORCE_PATH_STYLE: "false",
  RATE_LIMIT_ADAPTER: "upstash",
  RATE_LIMIT_KEY_SECRET: "abcdef0123456789abcdef0123456789",
  RATE_LIMIT_TRUSTED_PROXY: "vercel",
  RATE_LIMIT_ENV_PREFIX: "production",
  UPSTASH_REDIS_REST_URL: "https://redis.internal.test",
  UPSTASH_REDIS_REST_TOKEN: "deployment-redis-token",
};

function runValidation(overrides: Record<string, string | undefined> = {}) {
  const environment = {
    PATH: process.env.PATH,
    Path: process.env.Path,
    PATHEXT: process.env.PATHEXT,
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    ...productionEnvironment,
  } as NodeJS.ProcessEnv;
  for (const [name, value] of Object.entries(overrides)) {
    if (value === undefined) delete environment[name];
    else environment[name] = value;
  }
  return spawnSync(process.execPath, ["--import", "tsx", "scripts/validate-environment.ts"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: environment,
  });
}

test("deployment validation reaches the explicit unresolved public-launch gate without contacting backends", () => {
  const result = runValidation();
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Public site validation failed: legal effective date requires owner confirmation\./);
});

test("deployment validation requires production mode and every subsystem", () => {
  for (const [overrides, variable] of [
    [{ NODE_ENV: "development" }, "NODE_ENV"],
    [{ DATABASE_URL: undefined }, "DATABASE_URL"],
    [{ AUTH_SECRET: undefined }, "AUTH_SECRET"],
    [{ S3_BUCKET: undefined }, "S3_BUCKET"],
    [{ UPSTASH_REDIS_REST_TOKEN: undefined }, "UPSTASH_REDIS_REST_TOKEN"],
  ] as const) {
    const result = runValidation(overrides);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(variable));
    assert.equal(result.stdout, "");
  }
});

test("deployment failures never expose supplied configuration values", () => {
  const sensitiveValues = [
    productionEnvironment.DATABASE_URL,
    productionEnvironment.AUTH_SECRET,
    productionEnvironment.S3_ACCESS_KEY_ID,
    productionEnvironment.S3_SECRET_ACCESS_KEY,
    productionEnvironment.UPSTASH_REDIS_REST_TOKEN,
  ];
  const invalidAuthUrl = "credential-user:credential-password";
  const result = runValidation({ AUTH_URL: invalidAuthUrl });
  assert.notEqual(result.status, 0);
  const output = `${result.stdout}${result.stderr}`;
  for (const value of [...sensitiveValues, invalidAuthUrl, "credential-user", "credential-password"]) {
    assert.doesNotMatch(output, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(output, /\{.*DATABASE_URL|deployment-password|deployment-redis-token/);
});

test("the command is explicit and is not part of build or ordinary module imports", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8")) as { scripts: Record<string, string> };
  assert.equal(packageJson.scripts["validate:env"], "tsx scripts/validate-environment.ts");
  assert.doesNotMatch(packageJson.scripts.build, /validate:env|validate-environment/);

  for (const file of ["next.config.ts", "proxy.ts", "auth.ts", "lib/prisma.ts"]) {
    assert.doesNotMatch(await readFile(file, "utf8"), /validate-environment/);
  }
});
