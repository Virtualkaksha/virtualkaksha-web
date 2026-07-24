import Link from "next/link";

import prisma from "@/lib/prisma";

type StudentResourcesPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
  }>;
};

const boardIcons: Record<string, string> = {
  cbse: "📘",
  icse: "📗",
};

const examIcons: Record<string, string> = {
  jee: "⚙️",
  neet: "🧬",
  cuet: "🎯",
};

const resourceIcons: Record<string, string> = {
  NOTES: "📄",
  NCERT_SOLUTIONS: "📘",
  NCERT_EXEMPLAR: "📙",
  VIDEO_LECTURES: "🎥",
  IMPORTANT_QUESTIONS: "❓",
  PREVIOUS_YEAR_QUESTIONS: "📚",
  PREVIOUS_YEAR_PAPERS: "📚",
  WORKSHEETS: "🗂️",
  FORMULA_SHEETS: "🧮",
  MIND_MAPS: "🧠",
  TESTS: "📝",
  CHAPTER_TESTS: "📝",
  SAMPLE_PAPERS: "📑",
  ASSIGNMENTS: "✍️",
};

function getBoardIcon(slug: string, boardType: string) {
  if (boardIcons[slug]) {
    return boardIcons[slug];
  }

  if (boardType === "STATE") {
    return "🏫";
  }

  return "📖";
}

function getExamIcon(slug: string) {
  return examIcons[slug] ?? "🎯";
}

function getResourceIcon(code: string) {
  return resourceIcons[code.toUpperCase()] ?? "📄";
}

function getSearchValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
}

export default async function StudentResourcesPage({
  searchParams,
}: StudentResourcesPageProps) {
  const resolvedSearchParams = await searchParams;
  const searchQuery = getSearchValue(resolvedSearchParams?.q);

  const boardWhere = {
    isActive: true,
    ...(searchQuery
      ? {
          OR: [
            {
              name: {
                contains: searchQuery,
                mode: "insensitive" as const,
              },
            },
            {
              shortName: {
                contains: searchQuery,
                mode: "insensitive" as const,
              },
            },
            {
              description: {
                contains: searchQuery,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const examWhere = {
    isActive: true,
    ...(searchQuery
      ? {
          OR: [
            {
              name: {
                contains: searchQuery,
                mode: "insensitive" as const,
              },
            },
            {
              shortName: {
                contains: searchQuery,
                mode: "insensitive" as const,
              },
            },
            {
              description: {
                contains: searchQuery,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const resourceTypeWhere = {
    isActive: true,
    ...(searchQuery
      ? {
          OR: [
            {
              name: {
                contains: searchQuery,
                mode: "insensitive" as const,
              },
            },
            {
              nameHindi: {
                contains: searchQuery,
                mode: "insensitive" as const,
              },
            },
            {
              code: {
                contains: searchQuery,
                mode: "insensitive" as const,
              },
            },
            {
              description: {
                contains: searchQuery,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const [boards, exams, resourceTypes] = await Promise.all([
    prisma.board.findMany({
      where: boardWhere,
      select: {
        id: true,
        name: true,
        shortName: true,
        slug: true,
        boardType: true,
        stateName: true,
        description: true,
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

    prisma.exam.findMany({
      where: examWhere,
      select: {
        id: true,
        name: true,
        shortName: true,
        slug: true,
        description: true,
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

    prisma.resourceType.findMany({
      where: resourceTypeWhere,
      select: {
        id: true,
        name: true,
        nameHindi: true,
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

  const totalLearningTracks = boards.length + exams.length;
  const hasSearchResults =
    totalLearningTracks > 0 || resourceTypes.length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
            Study Resources
          </p>

          <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            Choose your board or exam and start learning.
          </h1>

          <p className="mt-4 text-base leading-7 text-slate-600">
            Find learning material organised by board, class, subject and
            chapter.
          </p>
        </div>

        <form
          action="/student/resources"
          method="GET"
          className="mt-7 rounded-2xl bg-slate-50 p-4"
        >
          <label
            htmlFor="resource-search"
            className="text-sm font-semibold text-slate-700"
          >
            Search learning tracks and resource types
          </label>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="resource-search"
              name="q"
              type="search"
              defaultValue={searchQuery}
              placeholder="Search CBSE, Physics, JEE, notes or videos"
              className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            <button
              type="submit"
              className="min-h-12 rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Search
            </button>

            {searchQuery ? (
              <Link
                href="/student/resources"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      {searchQuery ? (
        <section className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
          <p className="text-sm text-blue-900">
            Showing database results for{" "}
            <span className="font-semibold">“{searchQuery}”</span>
          </p>
        </section>
      ) : null}

      {!hasSearchResults && searchQuery ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="text-4xl" aria-hidden="true">
            🔍
          </div>

          <h2 className="mt-4 text-xl font-bold text-slate-900">
            No matching results found
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            No active board, competitive exam or resource type currently
            matches your search.
          </p>

          <Link
            href="/student/resources"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            View all resources
          </Link>
        </section>
      ) : null}

      {totalLearningTracks > 0 ? (
        <section>
          <div>
            <p className="text-sm font-semibold text-blue-700">
              Select learning track
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Boards and competitive exams
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              {totalLearningTracks} active{" "}
              {totalLearningTracks === 1 ? "track" : "tracks"} available
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {boards.map((board) => (
              <Link
                key={board.id}
                href={`/student/resources/${board.slug}`}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                    {getBoardIcon(board.slug, board.boardType)}
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {board.boardType === "STATE"
                      ? "State Board"
                      : "School Board"}
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-semibold text-slate-900">
                  {board.shortName}
                </h3>

                <p className="mt-1 text-sm font-medium text-slate-700">
                  {board.name}
                </p>

                {board.stateName ? (
                  <p className="mt-2 text-sm text-slate-500">
                    {board.stateName}
                  </p>
                ) : null}

                {board.description ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                    {board.description}
                  </p>
                ) : null}

                <p className="mt-5 text-sm font-semibold text-blue-700">
                  Explore {board.shortName}{" "}
                  <span aria-hidden="true">→</span>
                </p>
              </Link>
            ))}

            {exams.map((exam) => (
              <Link
                key={exam.id}
                href={`/student/resources/${exam.slug}`}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-2xl">
                    {getExamIcon(exam.slug)}
                  </div>

                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    Competitive Exam
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-semibold text-slate-900">
                  {exam.shortName}
                </h3>

                <p className="mt-1 text-sm font-medium text-slate-700">
                  {exam.name}
                </p>

                {exam.description ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                    {exam.description}
                  </p>
                ) : null}

                <p className="mt-5 text-sm font-semibold text-blue-700">
                  Explore {exam.shortName}{" "}
                  <span aria-hidden="true">→</span>
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : !searchQuery ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="text-4xl" aria-hidden="true">
            📚
          </div>

          <h2 className="mt-4 text-xl font-bold text-slate-900">
            No learning tracks published yet
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Add active boards or competitive exams to PostgreSQL. They will
            automatically appear here.
          </p>
        </section>
      ) : null}

      {resourceTypes.length > 0 ? (
        <section>
          <div>
            <p className="text-sm font-semibold text-blue-700">
              Everything in one place
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Available resource types
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              These resource categories are loaded directly from the database.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {resourceTypes.map((resourceType) => (
              <article
                key={resourceType.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                    {resourceType.iconName ??
                      getResourceIcon(resourceType.code)}
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {resourceType.name}
                    </h3>

                    {resourceType.nameHindi ? (
                      <p className="mt-0.5 text-sm font-medium text-slate-500">
                        {resourceType.nameHindi}
                      </p>
                    ) : null}

                    {resourceType.description ? (
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {resourceType.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl bg-slate-900 px-6 py-8 text-white sm:px-10">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-blue-300">
              Learn your way
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Different resources. Different teachers. One learning platform.
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Explore learning material and educators according to your board,
              class, subject and chapter.
            </p>
          </div>

          <Link
            href="/student/teachers"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Explore Teachers
          </Link>
        </div>
      </section>
    </div>
  );
}