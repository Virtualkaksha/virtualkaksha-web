import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicCatalogueScreen } from "@/components/public/PublicCatalogueScreen";
import { parseStudentSearchQuery } from "@/lib/resources/resource-search-query";
import { isPublicCatalogueSubject, listPublicCatalogueEntries, publicPageSeo } from "@/lib/seo/public-listing";

type Params = { level: string; subject: string };

export function generateStaticParams() {
  return listPublicCatalogueEntries().map((entry) => ({ level: entry.classSlug, subject: entry.subjectSlug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { level, subject } = await params;
  if (!isPublicCatalogueSubject(level, subject)) return {};
  const seo = publicPageSeo({ level, subject });
  return { title: seo.title, description: seo.description, alternates: { canonical: seo.canonical } };
}

export default async function CbseSubjectPage({ params }: { params: Promise<Params> }) {
  const { level, subject } = await params;
  if (!isPublicCatalogueSubject(level, subject)) notFound();
  return <PublicCatalogueScreen query={parseStudentSearchQuery({ track: "cbse", trackType: "BOARD", level, subject })} />;
}
