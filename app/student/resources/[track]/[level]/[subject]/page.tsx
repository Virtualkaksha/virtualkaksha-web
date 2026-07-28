import Link from "next/link";
import { notFound } from "next/navigation";

import { getSubjectChapterCatalog } from "@/lib/resources/resource-catalog";

type SubjectChaptersPageProps = {
  params: Promise<{ track: string; level: string; subject: string }>;
};

export default async function SubjectChaptersPage({
  params,
}: SubjectChaptersPageProps) {
  const { track, level, subject } = await params;
  const catalog = await getSubjectChapterCatalog(track, level, subject);

  if (!catalog) notFound();

  return (
    <div className="space-y-8 pb-12">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/student/resources" className="transition hover:text-blue-700">Study Resources</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/student/resources/${catalog.board.slug}`} className="transition hover:text-blue-700">{catalog.board.shortName}</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/student/resources/${catalog.board.slug}/${catalog.classLevel.slug}`} className="transition hover:text-blue-700">{catalog.classLevel.name}</Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-slate-900">{catalog.subject.name}</span>
      </nav>

      <section className="overflow-hidden rounded-3xl bg-slate-950 px-6 py-9 text-white sm:px-10 lg:px-12">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">{catalog.board.shortName}</span>
              <span className="rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-slate-300">{catalog.classLevel.name}</span>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl">{catalog.subject.icon.startsWith("http") ? catalog.subject.name.charAt(0) : catalog.subject.icon}</div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{catalog.subject.name}</h1>
                {catalog.subject.slug === "hindi" && catalog.subject.nameHindi ? <p className="mt-1 text-lg text-slate-300">{catalog.subject.nameHindi}</p> : null}
              </div>
            </div>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{catalog.subject.description}</p>
          </div>
          <div className="grid min-w-64 grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-2xl font-bold">{catalog.totals.chapters}</p><p className="mt-1 text-sm text-slate-300">Chapters</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-2xl font-bold">{catalog.totals.publishedResources}</p><p className="mt-1 text-sm text-slate-300">Resources</p></div>
          </div>
        </div>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Chapter catalogue</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Select a chapter to continue</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Open a chapter to access its notes, videos, solutions, questions and practice material.</p>

        {catalog.chapters.length > 0 ? (
          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {catalog.chapters.map((chapter, index) => (
              <Link key={chapter.id} href={chapter.href} className="group flex min-h-72 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-blue-700">{chapter.chapterNumber ?? index + 1}</div>
                  {chapter.publishedResourcesCount > 0 ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{chapter.publishedResourcesCount} resource{chapter.publishedResourcesCount === 1 ? "" : "s"}</span> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Coming soon</span>}
                </div>
                <h3 className="mt-6 text-xl font-bold text-slate-950">{chapter.name}</h3>
                {catalog.subject.slug === "hindi" && chapter.nameHindi ? <p className="mt-1 text-sm font-medium text-slate-500">{chapter.nameHindi}</p> : null}
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{chapter.description}</p>
                {chapter.resourceTypes.length > 0 ? <div className="mt-5 flex flex-wrap gap-2">{chapter.resourceTypes.slice(0, 3).map((type) => <span key={type.id} className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">{type.name} · {type.count}</span>)}</div> : null}
                <div className="mt-auto border-t border-slate-100 pt-5"><span className="text-sm font-semibold text-blue-700">Open chapter <span aria-hidden="true" className="inline-block transition group-hover:translate-x-1">→</span></span></div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="text-4xl">📚</div>
            <h3 className="mt-4 text-xl font-bold text-slate-950">Chapters are being prepared</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">Active chapters will automatically appear here as soon as they are added to the catalogue.</p>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div><h2 className="text-xl font-bold text-slate-950">Need another subject?</h2><p className="mt-2 text-sm text-slate-600">Return to {catalog.classLevel.name} and choose a different subject.</p></div>
          <Link href={`/student/resources/${catalog.board.slug}/${catalog.classLevel.slug}`} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">View all subjects</Link>
        </div>
      </section>
    </div>
  );
}
