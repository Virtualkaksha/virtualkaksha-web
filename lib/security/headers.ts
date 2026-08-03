export type SecurityHeader = Readonly<{ key: string; value: string }>;

const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "autoplay=()",
  "camera=()",
  "display-capture=()",
  "encrypted-media=()",
  "fullscreen=(self)",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "payment=()",
  "picture-in-picture=(self)",
  "publickey-credentials-get=(self)",
  "usb=()",
  "browsing-topics=()",
].join(", ");

export function buildStaticSecurityHeaders(environment: "development" | "production"): readonly SecurityHeader[] {
  return [
    ...(environment === "production"
      ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
      : []),
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
  ];
}

export const PROTECTED_PDF_HEADERS = Object.freeze({
  "Content-Type": "application/pdf",
  "Content-Disposition": 'inline; filename="resource.pdf"',
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
} as const);
