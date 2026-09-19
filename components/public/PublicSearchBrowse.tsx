import Link from "next/link";

import { publicBrowseHref } from "@/lib/resources/public-browse";
import type {
  BoardClassCatalogViewModel,
  ClassSubjectCatalogViewModel,
  SubjectChapterCatalogViewModel,
} from "@/lib/resources/resource-catalog";
import type { ResourceSearchQuery } from "@/lib/resources/resource-search-query";

const cardClass =
  "group flex min-h-44 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg";

export function PublicClassSwitcher({
  query,
  catalog,
}: {
  query: ResourceSearchQuery;
  catalog: BoardClassCatalogViewModel;
}) {
  return (
    <nav aria-label="Choose a class" className="flex flex-wrap gap-2">
      {catalog.classes.map((classLevel) => {
        const selected = query.level === classLevel.slug;
        return (
          <Link
            key={classLevel.id}
            href={publicBrowseHref(query, { level: classLevel.slug })}
            aria-current={selected ? "page" : undefined}
            className={
              selected
                ? "rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
            }
          >
            {classLevel.name}
          </Link>
        );
      })}
    </nav>
  );
}

export function PublicBrowseBreadcrumb({
  query,
  className,
  subjectName,
  chapterName,
}: {
  query: ResourceSearchQuery;
  className?: string | null;
  subjectName?: string | null;
  chapterName?: string | null;
}) {
  return (
    <nav aria-label="Browse resources" className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
      <Link href={publicBrowseHref(query)} className="transition hover:text-blue-700">
        All classes
      </Link>
      {query.level ? (
        <>
          <span aria-hidden="true">/</span>
          {query.subject ? (
            <Link href={publicBrowseHref(query, { level: query.level })} className="transition hover:text-blue-700">
              {className ?? query.level}
            </Link>
          ) : (
            <span className="font-medium text-slate-900">{className ?? query.level}</span>
          )}
        </>
      ) : null}
      {query.subject ? (
        <>
          <span aria-hidden="true">/</span>
          {query.chapter ? (
            <Link
              href={publicBrowseHref(query, { level: query.level, subject: query.subject })}
              className="transition hover:text-blue-700"
            >
              {subjectName ?? query.subject}
            </Link>
          ) : (
            <span className="font-medium text-slate-900">{subjectName ?? query.subject}</span>
          )}
        </>
      ) : null}
      {query.chapter ? (
        <>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-slate-900">{chapterName ?? query.chapter}</span>
        </>
      ) : null}
    </nav>
  );
}

export function PublicClassCards({
  query,
  catalog,
}: {
  query: ResourceSearchQuery;
  catalog: BoardClassCatalogViewModel;
}) {
  return (
    <section>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Choose a class</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Browse by class</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        Open a class to see only the subjects taught in that class, then pick a chapter to view resources.
      </p>
      <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {catalog.classes.map((classLevel) => (
          <Link key={classLevel.id} href={publicBrowseHref(query, { level: classLevel.slug })} className={cardClass}>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {classLevel.subjectsCount} subject{classLevel.subjectsCount === 1 ? "" : "s"}
            </span>
            <h3 className="mt-6 text-2xl font-bold text-slate-950">{classLevel.name}</h3>
            <p className="mt-2 text-sm text-slate-600">{classLevel.chaptersCount} chapters in the catalogue</p>
            <span className="mt-auto pt-5 text-sm font-semibold text-blue-700">
              View subjects <span aria-hidden="true" className="inline-block transition group-hover:translate-x-1">→</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function PublicSubjectCards({
  query,
  catalog,
}: {
  query: ResourceSearchQuery;
  catalog: ClassSubjectCatalogViewModel;
}) {
  return (
    <section>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
        {catalog.board.shortName} · {catalog.classLevel.name}
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Choose a subject</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        These are the subjects actually taught in {catalog.classLevel.name}, not subjects from other classes.
      </p>
      {catalog.subjects.length > 0 ? (
        <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {catalog.subjects.map((subject) => (
            <Link
              key={subject.id}
              href={publicBrowseHref(query, { level: catalog.classLevel.slug, subject: subject.slug })}
              className={cardClass}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                  {subject.icon.startsWith("http") ? subject.name.charAt(0) : subject.icon}
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {subject.chaptersCount} chapter{subject.chaptersCount === 1 ? "" : "s"}
                </span>
              </div>
              <h3 className="mt-6 text-2xl font-bold text-slate-950">{subject.name}</h3>
              {subject.slug === "hindi" && subject.nameHindi ? (
                <p className="mt-1 text-sm font-medium text-slate-500">{subject.nameHindi}</p>
              ) : null}
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{subject.description}</p>
              <span className="mt-auto pt-5 text-sm font-semibold text-blue-700">
                View chapters <span aria-hidden="true" className="inline-block transition group-hover:translate-x-1">→</span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyBrowse
          title="No subjects for this class yet"
          description="Subjects will appear here once they are added to the class catalogue."
        />
      )}
    </section>
  );
}

export function PublicChapterCards({
  query,
  catalog,
}: {
  query: ResourceSearchQuery;
  catalog: SubjectChapterCatalogViewModel;
}) {
  return (
    <section>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
        {catalog.classLevel.name} · {catalog.subject.name}
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Choose a chapter</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        Open a chapter to see its notes, videos, solutions and other published resources.
      </p>
      {catalog.chapters.length > 0 ? (
        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {catalog.chapters.map((chapter, index) => (
            <Link
              key={chapter.id}
              href={publicBrowseHref(query, {
                level: catalog.classLevel.slug,
                subject: catalog.subject.slug,
                chapter: chapter.slug,
              })}
              className={`${cardClass} min-h-64`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-blue-700">
                  {chapter.chapterNumber ?? index + 1}
                </div>
                {chapter.publishedResourcesCount > 0 ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {chapter.publishedResourcesCount} resource{chapter.publishedResourcesCount === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    Coming soon
                  </span>
                )}
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-950">{chapter.name}</h3>
              {catalog.subject.slug === "hindi" && chapter.nameHindi ? (
                <p className="mt-1 text-sm font-medium text-slate-500">{chapter.nameHindi}</p>
              ) : null}
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{chapter.description}</p>
              <span className="mt-auto pt-5 text-sm font-semibold text-blue-700">
                View resources <span aria-hidden="true" className="inline-block transition group-hover:translate-x-1">→</span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyBrowse
          title="Chapters are being prepared"
          description={`Active chapters for ${catalog.subject.name} will appear here as soon as they are added.`}
        />
      )}
    </section>
  );
}

function EmptyBrowse({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <div className="text-4xl">📚</div>
      <h3 className="mt-4 text-xl font-bold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
