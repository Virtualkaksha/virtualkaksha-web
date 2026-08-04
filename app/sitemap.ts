import type { MetadataRoute } from "next";
import { PUBLIC_SITE_CONFIG } from "@/lib/public-site-config";
export default function sitemap(): MetadataRoute.Sitemap { return ["", "/about", "/contact", "/privacy", "/terms", "/search", "/login", "/signup"].map((path, index) => ({ url: `${PUBLIC_SITE_CONFIG.canonicalUrl}${path}`, changeFrequency: index === 0 ? "weekly" : "monthly", priority: index === 0 ? 1 : 0.7 })); }
