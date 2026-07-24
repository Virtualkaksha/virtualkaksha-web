import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/prisma";

type ChapterLearningHubPageProps = {
  params: Promise<{
    track: string;
    level: string;
    subject: string;
    chapter: string;
  }>;
};

const fallbackIcons: Record<string, string> = {
  NOTES: "📄",
  NCERT_SOLUTIONS: "📘",
  NCERT_EXEMPLAR: "📙",
  VIDEO_LECTURES: "🎥",
  IMPORTANT_QUESTIONS: "❓",
  PREVIOUS_YEAR_QUESTIONS: "📚",
  WORKSHEETS: "🗂️",
  FORMULA_SHEETS: "🧮",
  MIND_MAPS: "🧠",
  CHAPTER_TESTS: "📝",
  SAMPLE_PAPERS: "📑",
};

function getResourceIcon(code: string, iconName: string | null) {
  return iconName ?? fallbackIcons[code] ?? "📄";
}

function formatDuration(durationSeconds: number | null) {
  if (!durationSeconds) {
    return null;
  }

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }

  return `${Math.max(minutes, 1)} min`;
}

export default async function ChapterLearningHubPage({
  params,
}: ChapterLearningHubPageProps) {
  const { track, level, subject, chapter } = await params;

  const [selectedChapter, resourceTypes] = await Promise.all([
    prisma.chapter.findFirst({
      where: {
        slug: chapter,
        isActive: true,
        boardClassSubject: {
          isActive: true,
          board: {
            slug: track,
            isActive: true,
          },
          classLevel: {
            slug: level,
            isActive: true,
          },
          subject: {
            slug: subject,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        chapterNumber: true,
        description: true,
        boardClassSubject: {
          select: {
            board: {
              select: {
                name: true,
                shortName: true,
                slug: true,
              },
            },
            classLevel: {
              select: {
                name: true,
                slug: true,
              },
            },
            subject: {
              select: {
                name: true,
                        slug: true,
              },
            },
          },
        },
        resources: {
          where: {
            status: "PUBLISHED",
          },
          select: {
            id: true,
            title: true,
            description: true,
            slug: true,
            format: true,
            language: true,
            access: true,
            contentUrl: true,
            externalUrl: true,
            thumbnailUrl: true,
            textContent: true,
            durationSeconds: true,
            pageCount: true,
            publishedAt: true,
            sortOrder: true,
            resourceType: {
              select: {
                id: true,
                name: true,
                        code: true,
                slug: true,
                iconName: true,
                sortOrder: true,
              },
            },
            teachers: {
              orderBy: [
                {
                  isPrimary: "desc",
                },
                {
                  displayOrder: "asc",
                },
              ],
              select: {
                id: true,
                isPrimary: true,
                teacherProfile: {
                  select: {
                    id: true,
                    headline: true,
                    yearsOfExperience: true,
                    teachingMode: true,
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                        displayName: true,
                        avatarUrl: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: [
            {
              resourceType: {
                sortOrder: "asc",
              },
            },
            {
              sortOrder: "asc",
            },
            {
              publishedAt: "desc",
            },
          ],
        },
      },
    }),

    prisma.resourceType.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        slug: true,
        description: true,
        iconName: true,
        sortOrder: true,
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
    }),
  ]);

  if (!selectedChapter) {
    notFound();
  }

  const { board, classLevel, subject: selectedSubject } =
    selectedChapter.boardClassSubject;

  const resourcesByType = new Map<string, typeof selectedChapter.resources>();

  for (const resource of selectedChapter.resources) {
    const existingResources =
      resourcesByType.get(resource.resourceType.id) ?? [];

    existingResources.push(resource);
    resourcesByType.set(resource.resourceType.id, existingResources);
  }

  const linkedTeachers = Array.from(
    new Map(
      selectedChapter.resources
        .flatMap((resource) => resource.teachers)
        .map((teacherLink) => [
          teacherLink.teacherProfile.id,
          teacherLink.teacherProfile,
        ])
    ).values()
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link
          href="/student/resources"
          className="transition hover:text-blue-700"
        >
          Study Resources
        </Link>

        <span aria-hidden="true">/</span>

        <Link
          href={`/student/resources/${board.slug}`}
          className="transition hover:text-blue-700"
        >
          {board.shortName}
        </Link>

        <span aria-hidden="true">/</span>

        <Link
          href={`/student/resources/${board.slug}/${classLevel.slug}`}
          className="transition hover:text-blue-700"
        >
          {classLevel.name}
        </Link>

        <span aria-hidden="true">/</span>

        <Link
          href={`/student/resources/${board.slug}/${classLevel.slug}/${selectedSubject.slug}`}
          className="transition hover:text-blue-700"
        >
          {selectedSubject.name}
        </Link>

        <span aria-hidden="true">/</span>

        <span className="font-medium text-slate-900">
          {selectedChapter.name}
        </span>
      </nav>

      <section className="rounded-3xl bg-blue-700 px-6 py-8 text-white sm:px-10 sm:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
              {board.shortName} · {classLevel.name} · {selectedSubject.name}
            </p>

            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
              {selectedChapter.chapterNumber
                ? `Chapter ${selectedChapter.chapterNumber}: `
                : ""}
              {selectedChapter.name}
            </h1>

            <p className="mt-4 max-w-3xl leading-7 text-blue-100">
              {selectedChapter.description ??
                "Access all published notes, solutions, videos, questions and practice material for this chapter."}
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur-sm">
            <p className="text-sm text-blue-100">Published resources</p>

            <p className="mt-1 text-3xl font-bold">
              {selectedChapter.resources.length}
            </p>
          </div>
        </div>
      </section>

      <section>
        <p className="text-sm font-semibold text-blue-700">
          Chapter Learning Hub
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Everything you need for this chapter
        </h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {resourceTypes.map((resourceType) => {
            const resources = resourcesByType.get(resourceType.id) ?? [];

            return (
              <a
                key={resourceType.id}
                href={`#${resourceType.slug}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                    {getResourceIcon(
                      resourceType.code,
                      resourceType.iconName
                    )}
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {resources.length}
                  </span>
                </div>

                <h3 className="mt-4 font-semibold text-slate-900">
                  {resourceType.name}
                </h3>

                <p className="mt-3 text-sm font-semibold text-blue-700">
                  {resources.length > 0
                    ? "View resources →"
                    : "No published resources yet"}
                </p>
              </a>
            );
          })}
        </div>
      </section>

      <div className="space-y-8">
        {resourceTypes.map((resourceType) => {
          const resources = resourcesByType.get(resourceType.id) ?? [];

          return (
            <section
              id={resourceType.slug}
              key={resourceType.id}
              className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                    {getResourceIcon(
                      resourceType.code,
                      resourceType.iconName
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {resourceType.name}
                    </h2>

                    {resourceType.description ? (
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {resourceType.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {resources.length}{" "}
                  {resources.length === 1 ? "resource" : "resources"}
                </span>
              </div>

              {resources.length > 0 ? (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {resources.map((resource) => {
                    const resourceHref = `/student/resources/${board.slug}/${classLevel.slug}/${selectedSubject.slug}/${selectedChapter.slug}/${resource.slug}`;
                    const duration = formatDuration(
                      resource.durationSeconds
                    );

                    const cardContent = (
                      <>
                        <div className="flex items-start gap-4">
                          {resource.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={resource.thumbnailUrl}
                              alt=""
                              className="h-20 w-28 shrink-0 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">
                              {getResourceIcon(
                                resource.resourceType.code,
                                resource.resourceType.iconName
                              )}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-slate-900">
                              {resource.title}
                            </h3>

                            {resource.description ? (
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                                {resource.description}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {resource.format.replaceAll("_", " ")}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {resource.language}
                          </span>

                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {resource.access}
                          </span>

                          {duration ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              {duration}
                            </span>
                          ) : null}

                          {resource.pageCount ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              {resource.pageCount} pages
                            </span>
                          ) : null}
                        </div>

                        {resource.teachers.length > 0 ? (
                          <p className="mt-4 text-xs font-medium text-slate-500">
                            By{" "}
                            {resource.teachers
                              .map(({ teacherProfile }) => {
                                const user = teacherProfile.user;

                                return (
                                  user.displayName ??
                                  [user.firstName, user.lastName]
                                    .filter(Boolean)
                                    .join(" ")
                                );
                              })
                              .join(", ")}
                          </p>
                        ) : null}

                        <p className="mt-4 text-sm font-semibold text-blue-700">
                          Open resource →
                        </p>
                      </>
                    );

                    return (
                      <Link
                        key={resource.id}
                        href={resourceHref}
                        className="rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm"
                      >
                        {cardContent}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                  <p className="font-semibold text-slate-800">
                    No published {resourceType.name.toLowerCase()} yet
                  </p>

                  <p className="mt-2 text-sm text-slate-600">
                    Resources added through the admin panel will appear here
                    automatically.
                  </p>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-blue-700">
          Chapter Educators
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Teachers linked to published resources
        </h2>

        {linkedTeachers.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {linkedTeachers.map((teacher) => {
              const teacherName =
                teacher.user.displayName ??
                [teacher.user.firstName, teacher.user.lastName]
                  .filter(Boolean)
                  .join(" ");

              return (
                <article
                  key={teacher.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex items-center gap-4">
                    {teacher.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={teacher.user.avatarUrl}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700">
                        {teacher.user.firstName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {teacherName}
                      </h3>

                      {teacher.headline ? (
                        <p className="mt-1 text-sm text-slate-600">
                          {teacher.headline}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {teacher.yearsOfExperience !== null ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {teacher.yearsOfExperience} years experience
                      </span>
                    ) : null}

                    {teacher.teachingMode ? (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {teacher.teachingMode}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
            <p className="font-semibold text-slate-800">
              No teachers linked yet
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Verified educators will appear after their resources are
              assigned to this chapter.
            </p>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/student/resources/${board.slug}/${classLevel.slug}/${selectedSubject.slug}`}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          ← Back to {selectedSubject.name} chapters
        </Link>

        <Link
          href="/student/resources"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          Explore all resources
        </Link>
      </div>
    </div>
  );
}