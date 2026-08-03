export type CspEnvironment = "development" | "production";

const NONCE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

function validateNonce(nonce: string) {
  if (!NONCE_PATTERN.test(nonce)) {
    throw new Error("CSP nonce must be a non-empty base64url value between 16 and 128 characters.");
  }
  return nonce;
}

export function buildContentSecurityPolicy(nonce: string, environment: CspEnvironment) {
  const safeNonce = validateNonce(nonce);
  const isDevelopment = environment === "development";
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
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${isDevelopment ? " ws: wss:" : ""}`,
    "worker-src 'self' blob:",
    "frame-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "manifest-src 'self'",
    "media-src 'self' blob:",
  ];

  if (!isDevelopment) directives.push("upgrade-insecure-requests");
  return `${directives.join("; ")};`;
}
