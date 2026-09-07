import type { NextConfig } from "next";

import { buildStaticSecurityHeaders } from "./lib/security/headers";

const securityEnvironment = process.env.NODE_ENV === "production" ? "production" : "development";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "21mb",
    },
  },
  images: {
    // Only the video poster host is trusted, matching the content security policy.
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [...buildStaticSecurityHeaders(securityEnvironment)],
      },
      ...[
        "/api/admin/resources/:resourceId/asset",
        "/api/teacher/resources/:resourceId/asset",
        "/api/student/resources/:resourceId/asset",
      ].map((source) => ({
        source,
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      })),
    ];
  },
};

export default nextConfig;
