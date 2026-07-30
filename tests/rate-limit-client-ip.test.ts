import assert from "node:assert/strict";
import test from "node:test";

import { resolveTrustedClientIp } from "@/lib/rate-limit";

function request(headers: Record<string, string> = {}) {
  return new Request("https://virtual.test/login", { headers });
}

test("missing or invalid trusted-proxy configuration fails explicitly", () => {
  assert.deepEqual(
    resolveTrustedClientIp({ request: request(), environment: { NODE_ENV: "production" } }),
    { ok: false, code: "INVALID_CONFIGURATION", message: "RATE_LIMIT_TRUSTED_PROXY must be configured in production." },
  );
  assert.equal(
    resolveTrustedClientIp({ request: request(), environment: { RATE_LIMIT_TRUSTED_PROXY: "unknown" } }).ok,
    false,
  );
});

test("Vercel mode trusts only the first x-forwarded-for address", () => {
  const result = resolveTrustedClientIp({
    request: request({
      "x-forwarded-for": "203.0.113.10, 198.51.100.2",
      "x-real-ip": "192.0.2.1",
      "cf-connecting-ip": "192.0.2.2",
    }),
    environment: { RATE_LIMIT_TRUSTED_PROXY: "vercel" },
  });
  assert.deepEqual(result, { ok: true, address: "203.0.113.10" });
});

test("Vercel mode does not scan later or fallback headers for a valid address", () => {
  const malformedFirst = resolveTrustedClientIp({
    request: request({ "x-forwarded-for": "invalid, 203.0.113.10", "x-real-ip": "198.51.100.1" }),
    environment: { RATE_LIMIT_TRUSTED_PROXY: "vercel" },
  });
  assert.deepEqual(malformedFirst, {
    ok: false,
    code: "MALFORMED_IP",
    message: "The trusted client address is malformed.",
  });
  const fallbackOnly = resolveTrustedClientIp({
    request: request({ "x-real-ip": "203.0.113.10", "cf-connecting-ip": "198.51.100.1" }),
    environment: { RATE_LIMIT_TRUSTED_PROXY: "vercel" },
  });
  assert.equal(fallbackOnly.ok, false);
});

test("direct mode ignores every forwarded header", () => {
  const result = resolveTrustedClientIp({
    request: request({ "x-forwarded-for": "203.0.113.10", "x-real-ip": "198.51.100.1" }),
    directAddress: "192.0.2.25",
    environment: { RATE_LIMIT_TRUSTED_PROXY: "direct" },
  });
  assert.deepEqual(result, { ok: true, address: "192.0.2.25" });
  assert.equal(resolveTrustedClientIp({
    request: request({ "x-forwarded-for": "203.0.113.10" }),
    environment: { RATE_LIMIT_TRUSTED_PROXY: "direct" },
  }).ok, false);
});

test("test injection is deterministic and forbidden in production", () => {
  assert.deepEqual(resolveTrustedClientIp({
    testAddress: "2001:db8::1",
    environment: { NODE_ENV: "test", RATE_LIMIT_TRUSTED_PROXY: "test" },
  }), { ok: true, address: "2001:db8::1" });
  assert.deepEqual(resolveTrustedClientIp({
    testAddress: "203.0.113.10",
    environment: { NODE_ENV: "production", RATE_LIMIT_TRUSTED_PROXY: "test" },
  }), {
    ok: false,
    code: "INVALID_CONFIGURATION",
    message: "The test proxy mode is unavailable in production.",
  });
});

