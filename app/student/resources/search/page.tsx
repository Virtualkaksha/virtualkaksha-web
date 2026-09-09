import Link from "next/link";

import ResourceSearchForm from "@/components/student/ResourceSearchForm";
import ResourceSearchResults from "@/components/student/ResourceSearchResults";
import { getCurrentIdentity } from "@/lib/auth/current-identity";
import { getCatalogueFilterPresentation } from "@/lib/resources/catalogue-types";
import { searchStudentResources } from "@/lib/resources/resource-search";
import { buildResourceSearchUrl, parseStudentSearchQuery, type RawSearchParams } from "@/lib/resources/resource-search-query";

export default async function StudentResourceSearchPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const identity = await getCurrentIdentity();
  const studentId = identity?.roles.includes("STUDENT") ? identity.id : undefined;
  const query = parseStudentSearchQuery(await searchParams);
  const result = await searchStudentResources(query, studentId);
  const { page, totalPages, total } = result.pagination;
  const presentation = getCatalogueFilterPresentation(query.type, result.facets.resourceTypes);
  const description = query.type && presentation.description
    ? presentation.description
    : "Search published, free resources by title, chapter, subject, or teacher. Curated order is the default; it is not full-text relevance ranking.";

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10">
        <Link href="/student/resources" className="text-sm font-semibold text-blue-700">← Study resources</Link>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">{presentation.heading}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 sm:p-5">
          <ResourceSearchForm query={query} facets={result.facets} />
        </div>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-700">{total} {total === 1 ? "resource" : "resources"}</p>
        <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
      </div>

      <ResourceSearchResults items={result.items} emptyTitle={presentation.emptyTitle} emptyDescription={presentation.emptyDescription} />

      {totalPages > 1 ? (
        <nav aria-label="Search result pages" className="flex items-center justify-center gap-3">
          {page > 1 ? <Link href={buildResourceSearchUrl("/student/resources/search", query, page - 1)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Previous</Link> : null}
          {page < totalPages ? <Link href={buildResourceSearchUrl("/student/resources/search", query, page + 1)} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Next</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}
