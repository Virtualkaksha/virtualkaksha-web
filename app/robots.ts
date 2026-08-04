import type { MetadataRoute } from "next";
import { PUBLIC_SITE_CONFIG } from "@/lib/public-site-config";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: ["/", "/about", "/contact", "/privacy", "/terms", "/search"], disallow: ["/admin/", "/teacher/", "/student/", "/api/"] }, sitemap: `${PUBLIC_SITE_CONFIG.canonicalUrl}/sitemap.xml`, host: PUBLIC_SITE_CONFIG.canonicalUrl }; }
