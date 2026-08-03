import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { createAuthRuntimeConfig } from "@/auth.config";
import { buildContentSecurityPolicy } from "@/lib/security/csp";

const CSP_REPORT_ONLY_HEADER = "Content-Security-Policy-Report-Only";
const NONCE_REQUEST_HEADER = "x-nonce";
const { auth } = NextAuth(async () => createAuthRuntimeConfig());

const EXCLUDED_PAGE_PATHS = new Set([
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/site.webmanifest",
  "/apple-touch-icon.png",
]);

export function shouldApplyNonceCsp(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    !["GET", "HEAD"].includes(request.method)
    || pathname === "/api"
    || pathname.startsWith("/api/")
    || pathname.startsWith("/_next/")
    || EXCLUDED_PAGE_PATHS.has(pathname)
    || request.headers.has("rsc")
    || request.headers.has("next-router-prefetch")
    || request.headers.get("purpose")?.toLowerCase() === "prefetch"
  ) return false;

  return request.headers.get("sec-fetch-dest") === "document"
    || request.headers.get("accept")?.toLowerCase().includes("text/html") === true;
}

export function generateCspNonce() {
  return crypto.randomUUID().replaceAll("-", "");
}

export function applyReportOnlyCsp(request: NextRequest) {
  if (!shouldApplyNonceCsp(request)) return NextResponse.next();

  const nonce = generateCspNonce();
  const environment = process.env.NODE_ENV === "production" ? "production" : "development";
  const policy = buildContentSecurityPolicy(nonce, environment);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSP_REPORT_ONLY_HEADER, policy);
  requestHeaders.set(NONCE_REQUEST_HEADER, nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_REPORT_ONLY_HEADER, policy);
  return response;
}

export default auth((request) => applyReportOnlyCsp(request));

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|site.webmanifest|apple-touch-icon.png).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
