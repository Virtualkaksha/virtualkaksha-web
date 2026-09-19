import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import {
  PublicBrowseBreadcrumb,
  PublicChapterCards,
  PublicClassSwitcher,
  PublicSubjectCards,
} from "@/components/public/PublicSearchBrowse";
import { CATALOGUE_TYPE_SLUGS, getCatalogueFilterPresentation, publicCatalogueTypeHref } from "@/lib/resources/catalogue-types";
import { DEFAULT_PUBLIC_CLASS_SLUG, publicBrowseHref } from "@/lib/resources/public-browse";
import { loadPublicCataloguePage } from "@/lib/resources/public-resource-search";
import { getCurrentStudentClassScope } from "@/lib/students/class-scope";
import { buildResourceSearchUrl, parseStudentSearchQuery, type RawSearchParams } from "@/lib/resources/resource-search-query";

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const query = parseStudentSearchQuery(await searchParams);
  if (query.type === CATALOGUE_TYPE_SLUGS.previousYearQuestions) {
    return { title: "Previous Year Papers", alternates: { canonical: publicCatalogueTypeHref(CATALOGUE_TYPE_SLUGS.previousYearQuestions) } };
  }
  return { title: "Search learning resources", alternates: { canonical: "/search" } };
}

const field = "min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm";

export default async function PublicSearchPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const parsed = parseStudentSearchQuery(await searchParams);
  const studentScope = await getCurrentStudentClassScope();
  let catalogue;
  try {
    catalogue = await loadPublicCataloguePage(
      parsed,
      studentScope ? { boardSlug: studentScope.boardSlug, classSlug: studentScope.classSlug } : null,
    );
  } catch {
    return <SearchFailure />;
  }

  const { query, step, facets, items, pagination, classCatalog, subjectCatalog, chapterCatalog } = catalogue;
  const presentation = getCatalogueFilterPresentation(query.type, facets.resourceTypes);
  const className = subjectCatalog?.classLevel?.name ?? chapterCatalog?.classLevel?.name ?? null;
  const subjectName = chapterCatalog?.subject?.name ?? null;
  const chapterName = chapterCatalog?.chapters.find((item) => item.slug === query.chapter)?.name ?? null;
  const heading = browseHeading(step, presentation.heading, className, subjectName, chapterName);
  const description = browseDescription(step, query.type ? presentation.description : null);

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12">
        <header>
          <h1 className="text-4xl font-bold text-slate-950">{heading}</h1>
          <p className="mt-3 text-slate-600">{description}</p>
        </header>

        <form action="/search" className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-4">
          <input type="hidden" name="track" value={query.track || "cbse"} />
          <input type="hidden" name="trackType" value={query.trackType || "BOARD"} />
          {query.level ? <input type="hidden" name="level" value={query.level} /> : null}
          {query.subject ? <input type="hidden" name="subject" value={query.subject} /> : null}
          {query.chapter ? <input type="hidden" name="chapter" value={query.chapter} /> : null}
          <input className={`${field} md:col-span-2`} aria-label="Search resources" name="q" type="search" maxLength={100} defaultValue={query.q} placeholder="Title, chapter or subject" />
          <select className={field} aria-label="Resource type" name="type" defaultValue={query.type}>
            <option value="">All resource types</option>
            {facets.resourceTypes.map((item) => (
              <option key={item.slug} value={item.slug}>{item.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white">Search</button>
            <Link href={publicBrowseHref({ q: "", type: "", track: "cbse", trackType: "BOARD" }, { level: DEFAULT_PUBLIC_CLASS_SLUG })} className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700">Clear</Link>
          </div>
        </form>

        {classCatalog && !studentScope ? (
          <div className="mt-8">
            <p className="mb-3 text-sm font-semibold text-slate-700">Class</p>
            <PublicClassSwitcher query={query} catalog={classCatalog} />
          </div>
        ) : null}
        {studentScope ? (
          <p className="mt-8 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950">
            Showing {studentScope.boardName} {studentScope.className} resources for your account. Change class from{" "}
            <Link href="/student/profile" className="font-semibold underline-offset-2 hover:underline">My Profile</Link>.
          </p>
        ) : null}

        {step !== "classes" && step !== "subjects" ? (
          <div className="mt-6">
            <PublicBrowseBreadcrumb
              query={query}
              className={className}
              subjectName={subjectName}
              chapterName={chapterName}
            />
          </div>
        ) : null}

        <div className="mt-8">
          {step === "subjects" && subjectCatalog ? <PublicSubjectCards query={query} catalog={subjectCatalog} /> : null}
          {step === "chapters" && chapterCatalog ? <PublicChapterCards query={query} catalog={chapterCatalog} /> : null}
          {step === "subjects" && !subjectCatalog ? (
            <MissingCatalogue
              title="This class is not in the catalogue"
              href={publicBrowseHref(query, { level: DEFAULT_PUBLIC_CLASS_SLUG })}
              label="View Class 10 subjects"
            />
          ) : null}
          {step === "chapters" && !chapterCatalog ? (
            <MissingCatalogue
              title="This subject is not taught in the selected class"
              href={publicBrowseHref(query, { level: query.level })}
              label="View class subjects"
            />
          ) : null}
          {step === "resources" ? (
            <>
              <p className="text-sm font-semibold text-slate-700">
                {pagination.total} {pagination.total === 1 ? "resource" : "resources"}
              </p>
              {items.length ? (
                <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((item, index) => (
                    <article key={`${item.title}-${item.academicLabel}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-6">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{item.resourceType} · {item.format}</p>
                      <h2 className="mt-2 text-xl font-bold text-slate-950">{item.title}</h2>
                      <p className="mt-2 text-sm text-slate-500">{item.academicLabel}</p>
                      {item.description ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{item.description}</p> : null}
                      <Link href={item.openHref} className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Open resource</Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                  <h2 className="text-xl font-bold">{presentation.emptyTitle}</h2>
                  <p className="mt-2 text-slate-600">{presentation.emptyDescription}</p>
                </div>
              )}
              {pagination.totalPages > 1 ? (
                <nav aria-label="Search result pages" className="mt-8 flex justify-center gap-3">
                  {pagination.page > 1 ? <Link href={buildResourceSearchUrl("/search", query, pagination.page - 1)} className="rounded-xl border px-4 py-2">Previous</Link> : null}
                  {pagination.page < pagination.totalPages ? <Link href={buildResourceSearchUrl("/search", query, pagination.page + 1)} className="rounded-xl bg-blue-700 px-4 py-2 text-white">Next</Link> : null}
                </nav>
              ) : null}
            </>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}

function browseHeading(
  step: "classes" | "subjects" | "chapters" | "resources",
  fallback: string,
  className?: string | null,
  subjectName?: string | null,
  chapterName?: string | null,
) {
  if (step === "subjects" && className) return `${className} subjects`;
  if (step === "chapters" && className && subjectName) return `${className} ${subjectName} chapters`;
  if (step === "resources" && chapterName) return chapterName;
  return fallback;
}

function browseDescription(step: "classes" | "subjects" | "chapters" | "resources", typedDescription: string | null) {
  if (typedDescription && step === "resources") return typedDescription;
  if (step === "classes") {
    return "Choose a class from the tabs above, then pick a subject and chapter.";
  }
  if (step === "subjects") {
    return "Pick a subject for this class to see its chapters. Switch class with the tabs above.";
  }
  if (step === "chapters") {
    return "Pick a chapter to view its published notes, videos, solutions and other resources.";
  }
  return "Browse and open published free resources without signing in. Create an account to bookmark material and save reading progress.";
}

function MissingCatalogue({ title, href, label }: { title: string; href: string; label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
      <h2 className="text-xl font-bold">{title}</h2>
      <Link href={href} className="mt-4 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">{label}</Link>
    </div>
  );
}

function SearchFailure() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20 text-center">
        <h1 className="text-3xl font-bold">Resources are temporarily unavailable</h1>
        <p className="mt-3 text-slate-600">Please try again later. No internal error details have been displayed.</p>
        <Link href="/" className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">Return home</Link>
      </main>
      <Footer />
    </>
  );
}
