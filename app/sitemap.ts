import type { MetadataRoute } from "next";
import { PUBLIC_SITE_CONFIG } from "@/lib/public-site-config";
import { listPublicCataloguePaths } from "@/lib/seo/public-listing";

const marketing = ["", "/about", "/contact", "/privacy", "/terms", "/search", "/login", "/signup", "/teachers"];

export default function sitemap(): MetadataRoute.Sitemap {
  const marketingEntries = marketing.map((path, index) => ({
    url: `${PUBLIC_SITE_CONFIG.canonicalUrl}${path}`,
    changeFrequency: (index === 0 ? "weekly" : "monthly") as "weekly" | "monthly",
    priority: index === 0 ? 1 : 0.7,
  }));
  const catalogueEntries = listPublicCataloguePaths().map((path) => ({
    url: `${PUBLIC_SITE_CONFIG.canonicalUrl}${path}`,
    changeFrequency: "weekly" as const,
    priority: path.split("/").length <= 3 ? 0.8 : 0.6,
  }));
  return [...marketingEntries, ...catalogueEntries];
}
