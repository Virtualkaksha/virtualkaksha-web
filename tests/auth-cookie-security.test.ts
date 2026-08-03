import assert from "node:assert/strict";
import test from "node:test";

import "./helpers/server-only";

import { createAuthRuntimeConfig } from "@/auth.config";

test("production session cookie is explicitly secure and prefixed", () => {
  const config = createAuthRuntimeConfig({
    NODE_ENV: "production",
    AUTH_SECRET: "a-production-auth-secret-with-at-least-32-characters",
    AUTH_URL: "https://virtualkaksha.in/api/auth",
    AUTH_TRUST_HOST: "true",
  });
  assert.equal(config.useSecureCookies, true);
  assert.deepEqual(config.cookies?.sessionToken, {
    name: "__Secure-authjs.session-token",
    options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
  });
  assert.equal(config.session?.maxAge, 60 * 60 * 24 * 7);
  assert.doesNotMatch(JSON.stringify(config.cookies), /token-value|secret/);
});

test("development session cookie remains usable over loopback HTTP", () => {
  const config = createAuthRuntimeConfig({ NODE_ENV: "development", AUTH_URL: "http://localhost:3000/api/auth" });
  assert.equal(config.useSecureCookies, false);
  assert.deepEqual(config.cookies?.sessionToken, {
    name: "authjs.session-token",
    options: { httpOnly: true, sameSite: "lax", path: "/", secure: false },
  });
});
