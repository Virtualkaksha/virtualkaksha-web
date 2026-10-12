import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicCatalogueScreen } from "@/components/public/PublicCatalogueScreen";
import { parseStudentSearchQuery } from "@/lib/resources/resource-search-query";
import { isPublicCatalogueClass, listPublicCatalogueEntries, publicPageSeo } from "@/lib/seo/public-listing";

type Params = { level: string };

export function generateStaticParams() {
  return [...new Set(listPublicCatalogueEntries().map((entry) => entry.classSlug))].map((level) => ({ level }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { level } = await params;
  if (!isPublicCatalogueClass(level)) return {};
  const seo = publicPageSeo({ level });
  return { title: seo.title, description: seo.description, alternates: { canonical: seo.canonical } };
}

export default async function CbseClassPage({ params }: { params: Promise<Params> }) {
  const { level } = await params;
  if (!isPublicCatalogueClass(level)) notFound();
  return <PublicCatalogueScreen query={parseStudentSearchQuery({ track: "cbse", trackType: "BOARD", level })} />;
}
