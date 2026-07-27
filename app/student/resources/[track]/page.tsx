import Link from "next/link";
import { notFound } from "next/navigation";

import { getBoardClassCatalog } from "@/lib/resources/resource-catalog";

type BoardClassesPageProps = {
  params: Promise<{
    track: string;
  }>;
};

export default async function BoardClassesPage({
  params,
}: BoardClassesPageProps) {
  const { track } = await params;
  const catalog = await getBoardClassCatalog(track);

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

        <span className="font-medium text-slate-900">
          {catalog.board.shortName}
        </span>
      </nav>

      <section className="overflow-hidden rounded-3xl bg-slate-950 px-6 py-10 text-white sm:px-10 lg:px-12">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
              {catalog.board.category}
            </span>

            <span className="rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-slate-300">
              Database powered
            </span>
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            {catalog.board.name}
          </h1>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            {catalog.board.description}
          </p>

          <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-bold">{catalog.totals.classes}</p>
              <p className="mt-1 text-sm text-slate-300">Available classes</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-bold">{catalog.totals.subjects}</p>
              <p className="mt-1 text-sm text-slate-300">Class subjects</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-bold">{catalog.totals.chapters}</p>
              <p className="mt-1 text-sm text-slate-300">Active chapters</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Select class
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Which class are you studying in?
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Choose your class to view its active subjects, chapters, notes,
            videos, solutions and practice resources.
          </p>
        </div>

        {catalog.classes.length === 0 ? (
          <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <h3 className="text-xl font-semibold text-slate-900">
              No classes are currently available
            </h3>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
              This board exists in the catalogue, but no active
              board-class-subject mappings are available yet.
            </p>
          </div>
        ) : (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {catalog.classes.map((classLevel) => (
              <Link
                key={classLevel.id}
                href={classLevel.href}
                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
              >
                <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-blue-50 transition group-hover:bg-blue-100" />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-lg font-bold text-white">
                      {classLevel.numericLevel}
                    </div>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {classLevel.subjectsCount} subject
                      {classLevel.subjectsCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  <h3 className="mt-6 text-2xl font-bold text-slate-950">
                    {classLevel.name}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Explore {classLevel.subjectsCount} active subject
                    {classLevel.subjectsCount === 1 ? "" : "s"} and{" "}
                    {classLevel.chaptersCount} structured chapter
                    {classLevel.chaptersCount === 1 ? "" : "s"}.
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                    <span className="text-xs font-medium text-slate-500">
                      Class {classLevel.numericLevel}
                    </span>

                    <span className="text-sm font-semibold text-blue-700">
                      View subjects{" "}
                      <span
                        className="inline-block transition group-hover:translate-x-1"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Selected the wrong learning track?
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Return to the resource catalogue and choose another board or
              competitive examination.
            </p>
          </div>

          <Link
            href="/student/resources"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            View all learning tracks
          </Link>
        </div>
      </section>
    </div>
  );
}