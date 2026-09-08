import { VIDEO_FRAME_ORIGINS, VIDEO_IMAGE_ORIGINS } from "@/lib/resources/video-embed";

export type CspEnvironment = "development" | "production";

const NONCE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

function validateNonce(nonce: string) {
  if (!NONCE_PATTERN.test(nonce)) {
    throw new Error("CSP nonce must be a non-empty base64url value between 16 and 128 characters.");
  }
  return nonce;
}

const HTTPS_ORIGIN_PATTERN = /^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/;

function pinnedHttpsOrigins(origins: readonly string[]) {
  return origins.filter((origin) => HTTPS_ORIGIN_PATTERN.test(origin));
}

export function storageConnectSrcOrigins(endpoint = process.env.S3_ENDPOINT) {
  if (!endpoint) return [];
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" ? pinnedHttpsOrigins([url.origin]) : [];
  } catch {
    return [];
  }
}

export function buildContentSecurityPolicy(
  nonce: string,
  environment: CspEnvironment,
  extraConnectSrc: readonly string[] = [],
) {
  const safeNonce = validateNonce(nonce);
  const isDevelopment = environment === "development";
  const connectOrigins = pinnedHttpsOrigins(extraConnectSrc);
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${safeNonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    isDevelopment
      ? "style-src 'self' 'unsafe-inline'"
      : `style-src 'self' 'nonce-${safeNonce}'`,
    "style-src-attr 'unsafe-inline'",
    // Video lesson posters come from the video providers' image hosts.
    `img-src 'self' data: blob: ${VIDEO_IMAGE_ORIGINS.join(" ")}`,
    "font-src 'self'",
    `connect-src 'self'${isDevelopment ? " ws: wss:" : ""}${connectOrigins.map((origin) => ` ${origin}`).join("")}`,
    "worker-src 'self' blob:",
    // Video lessons are framed only from the pinned player origins.
    `frame-src 'self' ${VIDEO_FRAME_ORIGINS.join(" ")}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "manifest-src 'self'",
    "media-src 'self' blob:",
  ];

  if (!isDevelopment) directives.push("upgrade-insecure-requests");
  return `${directives.join("; ")};`;
}
