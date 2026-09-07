import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import "./helpers/server-only";

import { buildContentSecurityPolicy } from "@/lib/security/csp";
import { buildStaticSecurityHeaders, PROTECTED_PDF_HEADERS } from "@/lib/security/headers";
import { applyReportOnlyCsp, generateCspNonce, shouldApplyNonceCsp } from "@/proxy";
import { NextRequest } from "next/server";

const nonce = "0123456789abcdef_SAFE";

test("production CSP has the exact deterministic directives", () => {
  assert.equal(
    buildContentSecurityPolicy(nonce, "production"),
    `default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; script-src-attr 'none'; style-src 'self' 'nonce-${nonce}'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob: https://i.ytimg.com; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com; frame-ancestors 'none'; form-action 'self'; manifest-src 'self'; media-src 'self' blob:; upgrade-insecure-requests;`,
  );
});

test("development CSP permits only the required development capabilities", () => {
  const policy = buildContentSecurityPolicy(nonce, "development");
  assert.equal(
    policy,
    `default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob: https://i.ytimg.com; font-src 'self'; connect-src 'self' ws: wss:; worker-src 'self' blob:; frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com; frame-ancestors 'none'; form-action 'self'; manifest-src 'self'; media-src 'self' blob:;`,
  );
  assert.doesNotMatch(policy, /upgrade-insecure-requests/);
});

test("development permits tooling style elements and attributes without weakening scripts", () => {
  const policy = buildContentSecurityPolicy(nonce, "development");
  assert.match(policy, /style-src 'self' 'unsafe-inline'; style-src-attr 'unsafe-inline';/);
  assert.doesNotMatch(policy, new RegExp(`style-src[^;]*nonce-${nonce}`));
  assert.match(policy, new RegExp(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`));
  assert.match(policy, /script-src-attr 'none'/);
});

test("production requires a nonce for style elements while allowing style attributes", () => {
  const policy = buildContentSecurityPolicy(nonce, "production");
  assert.match(policy, new RegExp(`style-src 'self' 'nonce-${nonce}'; style-src-attr 'unsafe-inline';`));
  assert.doesNotMatch(policy, /style-src 'self' 'unsafe-inline'/);
  assert.match(policy, new RegExp(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic';`));
  assert.doesNotMatch(policy, /unsafe-eval|(?:^|\s)\*(?:\s|;|$)/);
});

test("production CSP excludes broad and infrastructure origins", () => {
  const policy = buildContentSecurityPolicy(nonce, "production");
  // A bare `https:` source would trust every host; pinned video origins are allowed.
  assert.doesNotMatch(policy, /unsafe-eval|(?:^|\s)\*(?:\s|;|$)|(?:^|\s)https:(?:\s|;|$)|s3|r2|upstash/i);
  assert.match(policy, /worker-src 'self' blob:/);
  assert.match(policy, /frame-src 'self' https:\/\/www\.youtube-nocookie\.com https:\/\/player\.vimeo\.com;/);
  assert.match(policy, /frame-ancestors 'none';/);
  assert.doesNotMatch(policy, /frame-src[^;]*(?<!-nocookie\.com)\byoutube\.com/);
});

test("CSP nonce validation rejects empty, short, malformed and injectable values", () => {
  for (const invalid of ["", "short", "has spaces 123456", "0123456789abcde'", "0123456789abcde;", "0123456789abcde+"]) {
    assert.throws(() => buildContentSecurityPolicy(invalid, "production"), /CSP nonce/);
  }
});

test("production static security headers are exact and omit COEP and HSTS preload", () => {
  const headers = buildStaticSecurityHeaders("production");
  assert.deepEqual(headers, [
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "Permissions-Policy", value: "accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), picture-in-picture=(self), publickey-credentials-get=(self), usb=(), browsing-topics=()" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
  ]);
  assert.equal(headers.some(({ key }) => key === "Cross-Origin-Embedder-Policy"), false);
  assert.doesNotMatch(headers[0].value, /preload/);
});

test("protected PDF response headers are exact", () => {
  assert.deepEqual(PROTECTED_PDF_HEADERS, {
    "Content-Type": "application/pdf",
    "Content-Disposition": 'inline; filename="resource.pdf"',
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
  });
});

function pageRequest(path = "/login", headers: HeadersInit = { accept: "text/html" }) {
  return new NextRequest(`https://virtualkaksha.test${path}`, { headers });
}

test("nonce generation is fresh and base64url safe", () => {
  const first = generateCspNonce();
  const second = generateCspNonce();
  assert.match(first, /^[A-Za-z0-9_-]{16,128}$/);
  assert.match(second, /^[A-Za-z0-9_-]{16,128}$/);
  assert.notEqual(first, second);
});

test("HTML requests receive matching request and response report-only CSP", () => {
  const response = applyReportOnlyCsp(pageRequest());
  const responsePolicy = response.headers.get("content-security-policy-report-only");
  const forwardedPolicy = response.headers.get("x-middleware-request-content-security-policy-report-only");
  const forwardedNonce = response.headers.get("x-middleware-request-x-nonce");
  assert.ok(responsePolicy);
  assert.equal(forwardedPolicy, responsePolicy);
  assert.ok(forwardedNonce);
  assert.match(responsePolicy, new RegExp(`'nonce-${forwardedNonce}'`));
  assert.equal(response.headers.has("content-security-policy"), false);
  assert.equal(response.headers.has("set-cookie"), false);
  assert.doesNotMatch(response.headers.get("location") ?? "", /nonce|x-nonce/i);
});

test("development report-only CSP includes HMR allowances", () => {
  const response = applyReportOnlyCsp(pageRequest());
  const policy = response.headers.get("content-security-policy-report-only") ?? "";
  assert.match(policy, /'unsafe-eval'/);
  assert.match(policy, /connect-src 'self' ws: wss:/);
});

test("API, PDF, Next.js assets and non-document requests skip nonce CSP", () => {
  const skipped = [
    pageRequest("/api/student/resources/resource-1/asset"),
    pageRequest("/_next/static/chunks/app.js"),
    pageRequest("/_next/image?url=%2Flogo.png"),
    pageRequest("/favicon.ico"),
    pageRequest("/student", { accept: "application/pdf" }),
    pageRequest("/student", { accept: "text/x-component", rsc: "1" }),
    new NextRequest("https://virtualkaksha.test/student", { method: "POST", headers: { accept: "text/html" } }),
  ];
  for (const request of skipped) {
    assert.equal(shouldApplyNonceCsp(request), false, request.nextUrl.pathname);
    const response = applyReportOnlyCsp(request);
    assert.equal(response.headers.has("content-security-policy-report-only"), false);
    assert.equal(response.headers.has("content-security-policy"), false);
  }
});

test("document destination enables nonce CSP without relying only on Accept", () => {
  assert.equal(shouldApplyNonceCsp(pageRequest("/", { "sec-fetch-dest": "document" })), true);
});

test("next.config globally wires static headers without an enforced CSP", async () => {
  const config = (await import("@/next.config")).default;
  assert.ok(config.headers);
  const entries = await config.headers();
  assert.equal(entries[0].source, "/(.*)");
  const keys = entries[0].headers.map(({ key }) => key);
  assert.ok(keys.includes("X-Content-Type-Options"));
  assert.ok(keys.includes("Cross-Origin-Resource-Policy"));
  assert.equal(keys.includes("Content-Security-Policy"), false);
  assert.equal(keys.includes("Content-Security-Policy-Report-Only"), false);
  assert.equal(keys.includes("Cross-Origin-Embedder-Policy"), false);
});

test("protected PDF routes override global DENY with SAMEORIGIN after the wildcard rule", async () => {
  const config = (await import("@/next.config")).default;
  assert.ok(config.headers);
  const entries = await config.headers();
  assert.equal(entries[0].source, "/(.*)");
  assert.deepEqual(entries.slice(1), [
    { source: "/api/admin/resources/:resourceId/asset", headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }] },
    { source: "/api/teacher/resources/:resourceId/asset", headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }] },
    { source: "/api/student/resources/:resourceId/asset", headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }] },
  ]);
  assert.equal(entries[0].headers.find(({ key }) => key === "X-Frame-Options")?.value, "DENY");
  assert.match(buildContentSecurityPolicy("abcdefghijklmnop", "production"), /frame-src 'self' https:\/\/www\.youtube-nocookie\.com https:\/\/player\.vimeo\.com;/);
  assert.doesNotMatch(buildContentSecurityPolicy("abcdefghijklmnop", "production"), /frame-src[^;]*\*/);
});

test("development static headers omit HSTS", () => {
  assert.equal(buildStaticSecurityHeaders("development").some(({ key }) => key === "Strict-Transport-Security"), false);
});

test("root layout opts into request-time rendering without exposing the nonce", async () => {
  const layout = await readFile("app/layout.tsx", "utf8");
  assert.match(layout, /import \{ connection \} from "next\/server"/);
  assert.match(layout, /await connection\(\)/);
  assert.doesNotMatch(layout, /x-nonce|nonce=|data-nonce/);
});
