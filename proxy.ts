import NextAuth from "next-auth";
import type { NextAuthRequest } from "next-auth";
import { NextFetchEvent, NextRequest, NextResponse, type NextMiddleware } from "next/server";

import { createAuthRuntimeConfig } from "@/auth.config";
import { buildContentSecurityPolicy, storageConnectSrcOrigins } from "@/lib/security/csp";

const CSP_REPORT_ONLY_HEADER = "Content-Security-Policy-Report-Only";
const NONCE_REQUEST_HEADER = "x-nonce";
const { auth } = NextAuth(async () => createAuthRuntimeConfig());

function withPrivateNavigationCache(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  const vary = response.headers.get("Vary");
  response.headers.set("Vary", vary && !/\bCookie\b/i.test(vary) ? `${vary}, Cookie` : "Cookie");
  return response;
}

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
  if (!shouldApplyNonceCsp(request)) {
    return withPrivateNavigationCache(NextResponse.next());
  }

  const nonce = generateCspNonce();
  const environment = process.env.NODE_ENV === "production" ? "production" : "development";
  const policy = buildContentSecurityPolicy(nonce, environment, storageConnectSrcOrigins());
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSP_REPORT_ONLY_HEADER, policy);
  requestHeaders.set(NONCE_REQUEST_HEADER, nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_REPORT_ONLY_HEADER, policy);
  return withPrivateNavigationCache(response);
}

const authorizedProxyPromise = auth((request: NextAuthRequest, event: NextFetchEvent) => {
  void event;
  return applyReportOnlyCsp(request);
}) as unknown as Promise<NextMiddleware>;

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const authorizedProxy = await authorizedProxyPromise;
  return authorizedProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|site.webmanifest|apple-touch-icon.png).*)",
  ],
};
