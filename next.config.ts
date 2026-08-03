import type { NextConfig } from "next";

import { buildStaticSecurityHeaders } from "./lib/security/headers";

const securityEnvironment = process.env.NODE_ENV === "production" ? "production" : "development";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "21mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [...buildStaticSecurityHeaders(securityEnvironment)],
      },
    ];
  },
};

export default nextConfig;
