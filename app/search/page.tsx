import type { Metadata } from "next";

import { PublicCatalogueScreen } from "@/components/public/PublicCatalogueScreen";
import { CATALOGUE_TYPE_SLUGS, publicCatalogueTypeHref } from "@/lib/resources/catalogue-types";
import { parseStudentSearchQuery, type RawSearchParams } from "@/lib/resources/resource-search-query";
import { publicPageSeo } from "@/lib/seo/public-listing";

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const query = parseStudentSearchQuery(await searchParams);
  if (query.type === CATALOGUE_TYPE_SLUGS.previousYearQuestions) {
    return { title: "Previous Year Papers", alternates: { canonical: publicCatalogueTypeHref(CATALOGUE_TYPE_SLUGS.previousYearQuestions) } };
  }
  const seo = publicPageSeo(query);
  return { title: seo.title, description: seo.description, alternates: { canonical: seo.canonical } };
}

export default async function PublicSearchPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return <PublicCatalogueScreen query={parseStudentSearchQuery(await searchParams)} />;
}
