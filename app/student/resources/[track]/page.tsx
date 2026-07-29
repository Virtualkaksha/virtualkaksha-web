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
              {catalog.board.shortName}
            </span>

            <span className="rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-slate-300">
              {catalog.board.category}
            </span>
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Choose your class
          </h1>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            {catalog.board.description}
          </p>

          <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
            <Stat value={catalog.totals.classes} label="Available classes" />
            <Stat value={catalog.totals.subjects} label="Active subjects" />
            <Stat value={catalog.totals.chapters} label="Available chapters" />
          </div>
        </div>
      </section>

      <section>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Class catalogue
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Select a class to continue
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Choose your class before exploring its subjects, chapters and
            published learning resources.
          </p>
        </div>

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
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl font-bold text-blue-700">
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

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Explore {classLevel.name} subjects and chapter-wise learning
                  resources.
                </p>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                  <span className="text-xs font-medium text-slate-500">
                    {classLevel.chaptersCount} chapter
                    {classLevel.chaptersCount === 1 ? "" : "s"}
                  </span>

                  <span className="text-sm font-semibold text-blue-700">
                    View subjects <span aria-hidden="true">→</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-slate-300">{label}</p>
    </div>
  );
}
