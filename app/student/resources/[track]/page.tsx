import Link from "next/link";
import { notFound } from "next/navigation";

import { getClassSubjectCatalog } from "@/lib/resources/resource-catalog";

type ClassSubjectsPageProps = {
  params: Promise<{
    track: string;
    level: string;
  }>;
};

export default async function ClassSubjectsPage({
  params,
}: ClassSubjectsPageProps) {
  const { track, level } = await params;
  const catalog = await getClassSubjectCatalog(track, level);

  if (!catalog) {
    notFound();
  }

  return (
    <div className="space-y-8 pb-12">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-sm text-slate-500"
      >
        <Link
          href="/student/resources"
          className="transition hover:text-blue-700"
        >
          Study Resources
        </Link>

        <span aria-hidden="true">/</span>

        <Link
          href={`/student/resources/${catalog.board.slug}`}
          className="transition hover:text-blue-700"
        >
          {catalog.board.shortName}
        </Link>

        <span aria-hidden="true">/</span>

        <span className="font-medium text-slate-900">
          {catalog.classLevel.name}
        </span>
      </nav>

      <section className="overflow-hidden rounded-3xl bg-slate-950 px-6 py-10 text-white sm:px-10 lg:px-12">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
              {catalog.board.shortName}
            </span>

            <span className="rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-slate-300">
              {catalog.classLevel.name}
            </span>
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Choose your subject
          </h1>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            Explore subject-wise chapters, notes, video lectures, solutions,
            previous-year questions and practice material for{" "}
            {catalog.board.shortName} {catalog.classLevel.name}.
          </p>

          <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-bold">{catalog.totals.subjects}</p>
              <p className="mt-1 text-sm text-slate-300">Active subjects</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-bold">{catalog.totals.chapters}</p>
              <p className="mt-1 text-sm text-slate-300">Available chapters</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-bold">
                {catalog.totals.publishedResources}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Published resources
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Subject catalogue
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Select a subject to continue
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Each subject contains its own structured chapter catalogue and
            published learning material.
          </p>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {catalog.subjects.map((subject) => (
            <Link
              key={subject.id}
              href={subject.href}
              className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
            >
              <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-blue-50 transition group-hover:bg-blue-100" />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                    {subject.icon.startsWith("http") ? (
                      <span className="text-lg font-bold text-blue-700">
                        {subject.name.charAt(0)}
                      </span>
                    ) : (
                      subject.icon
                    )}
                  </div>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {subject.chaptersCount} chapter
                    {subject.chaptersCount === 1 ? "" : "s"}
                  </span>
                </div>

                <h3 className="mt-6 text-2xl font-bold text-slate-950">
                  {subject.name}
                </h3>

                {subject.nameHindi ? (
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {subject.nameHindi}
                  </p>
                ) : null}

                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                  {subject.description}
                </p>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                  <span className="text-xs font-medium text-slate-500">
                    {subject.publishedResourcesCount} published resource
                    {subject.publishedResourcesCount === 1 ? "" : "s"}
                  </span>

                  <span className="text-sm font-semibold text-blue-700">
                    View chapters{" "}
                    <span
                      aria-hidden="true"
                      className="inline-block transition group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Need to choose another class?
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Return to the {catalog.board.shortName} class catalogue and
              select a different class.
            </p>
          </div>

          <Link
            href={`/student/resources/${catalog.board.slug}`}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            View all classes
          </Link>
        </div>
      </section>
    </div>
  );
}