import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicCatalogueScreen } from "@/components/public/PublicCatalogueScreen";
import { parseStudentSearchQuery } from "@/lib/resources/resource-search-query";
import { findPublicCatalogueChapter, listPublicCatalogueEntries, publicPageSeo } from "@/lib/seo/public-listing";

type Params = { level: string; subject: string; chapter: string };

export function generateStaticParams() {
  return listPublicCatalogueEntries().flatMap((entry) =>
    entry.chapters.map((chapter) => ({
      level: entry.classSlug,
      subject: entry.subjectSlug,
      chapter: chapter.slug,
    })),
  );
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { level, subject, chapter } = await params;
  if (!findPublicCatalogueChapter(level, subject, chapter)) return {};
  const seo = publicPageSeo({ level, subject, chapter });
  return { title: seo.title, description: seo.description, alternates: { canonical: seo.canonical } };
}

export default async function CbseChapterPage({ params }: { params: Promise<Params> }) {
  const { level, subject, chapter } = await params;
  if (!findPublicCatalogueChapter(level, subject, chapter)) notFound();
  return (
    <PublicCatalogueScreen
      query={parseStudentSearchQuery({ track: "cbse", trackType: "BOARD", level, subject, chapter })}
    />
  );
}
