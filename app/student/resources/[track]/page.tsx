import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/prisma";

type TrackPageProps = {
  params: Promise<{
    track: string;
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

function getBoardIcon(slug: string, boardType: string) {
  if (boardIcons[slug]) {
    return boardIcons[slug];
  }

  return boardType === "STATE" ? "🏫" : "📖";
}

function getExamIcon(slug: string) {
  return examIcons[slug] ?? "🎯";
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { track } = await params;

  /*
   * "state-boards" is a collection page rather than one individual board.
   */
  if (track === "state-boards") {
    const stateBoards = await prisma.board.findMany({
      where: {
        boardType: "STATE",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        shortName: true,
        slug: true,
        stateName: true,
        description: true,
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
    });

    return <StateBoardsPage stateBoards={stateBoards} />;
  }

  const [board, exam] = await Promise.all([
    prisma.board.findUnique({
      where: {
        slug: track,
      },
      select: {
        id: true,
        name: true,
        shortName: true,
        slug: true,
        boardType: true,
        description: true,
        isActive: true,
        boardClassSubjects: {
          where: {
            isActive: true,
            classLevel: {
              isActive: true,
            },
          },
          select: {
            classLevel: {
              select: {
                id: true,
                name: true,
                slug: true,
                numericLevel: true,
                sortOrder: true,
              },
            },
          },
          orderBy: {
            classLevel: {
              numericLevel: "asc",
            },
          },
        },
      },
    }),

    prisma.exam.findUnique({
      where: {
        slug: track,
      },
      select: {
        id: true,
        name: true,
        shortName: true,
        slug: true,
        description: true,
        isActive: true,
        examSubjects: {
          where: {
            isActive: true,
            subject: {
              isActive: true,
            },
          },
          select: {
            id: true,
            sortOrder: true,
            subject: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                iconUrl: true,
              },
            },
          },
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              subject: {
                name: "asc",
              },
            },
          ],
        },
      },
    }),
  ]);

  if (board?.isActive) {
    const uniqueClasses = Array.from(
      new Map(
        board.boardClassSubjects.map((item) => [
          item.classLevel.id,
          item.classLevel,
        ])
      ).values()
    ).sort((first, second) => first.numericLevel - second.numericLevel);

    return (
      <div className="mx-auto max-w-7xl space-y-8">
        <Breadcrumb title={board.shortName} />

        <TrackHero
          icon={getBoardIcon(board.slug, board.boardType)}
          label={
            board.boardType === "STATE"
              ? "State Board Learning Track"
              : "School Learning Track"
          }
          title={`${board.shortName} Resources`}
          description={
            board.description ??
            `Choose your class to explore ${board.shortName} subjects, chapters and learning resources.`
          }
        />

        <section>
          <p className="text-sm font-semibold text-blue-700">
            Select your class
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Available classes
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Classes shown below are connected to {board.shortName} subjects in
            the database.
          </p>

          {uniqueClasses.length > 0 ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {uniqueClasses.map((classLevel) => (
                <Link
                  key={classLevel.id}
                  href={`/student/resources/${board.slug}/${classLevel.slug}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl font-bold text-blue-700">
                      {classLevel.numericLevel}
                    </div>

                    <span className="text-xl text-slate-300 transition group-hover:text-blue-700">
                      →
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-semibold text-slate-900">
                    {classLevel.name}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Explore subjects, chapters, notes, videos, questions and
                    tests for {classLevel.name}.
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No classes connected yet"
              description={`No active classes and subjects are currently connected to ${board.shortName}.`}
            />
          )}
        </section>
      </div>
    );
  }

  if (exam?.isActive) {
    return (
      <div className="mx-auto max-w-7xl space-y-8">
        <Breadcrumb title={exam.shortName} />

        <TrackHero
          icon={getExamIcon(exam.slug)}
          label="Competitive Exam Track"
          title={`${exam.shortName} Resources`}
          description={
            exam.description ??
            `Choose a subject to explore ${exam.shortName} topics and learning resources.`
          }
        />

        <section>
          <p className="text-sm font-semibold text-blue-700">
            Select a subject
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            {exam.shortName} subjects
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Select a subject to access topics and preparation resources.
          </p>

          {exam.examSubjects.length > 0 ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {exam.examSubjects.map(({ id, subject }) => (
                <Link
                  key={id}
                  href={`/student/resources/${exam.slug}/${subject.slug}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-2xl">
                      {subject.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={subject.iconUrl}
                          alt=""
                          className="h-7 w-7 object-contain"
                        />
                      ) : (
                        "📚"
                      )}
                    </div>

                    <span className="text-xl text-slate-300 transition group-hover:text-blue-700">
                      →
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-semibold text-slate-900">
                    {subject.name}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {subject.description ??
                      `Explore ${subject.name} topics, notes, videos, questions and tests.`}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No subjects connected yet"
              description={`No active subjects are currently connected to ${exam.shortName}.`}
            />
          )}
        </section>
      </div>
    );
  }

  notFound();
}

type StateBoardsPageProps = {
  stateBoards: Array<{
    id: string;
    name: string;
    shortName: string;
    slug: string;
    stateName: string | null;
    description: string | null;
  }>;
};

function StateBoardsPage({ stateBoards }: StateBoardsPageProps) {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <Breadcrumb title="State Boards" />

      <TrackHero
        icon="🏫"
        label="State Board Learning Tracks"
        title="State Board Resources"
        description="Select your state education board to explore classes, subjects, chapters and learning resources."
      />

      <section>
        <p className="text-sm font-semibold text-blue-700">
          Select your state board
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Available state boards
        </h2>

        {stateBoards.length > 0 ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {stateBoards.map((board) => (
              <Link
                key={board.id}
                href={`/student/resources/${board.slug}`}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                    🏫
                  </div>

                  <span className="text-xl text-slate-300 transition group-hover:text-blue-700">
                    →
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
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {board.description}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No state boards available"
            description="State boards will appear here automatically after they are added to the database."
          />
        )}
      </section>
    </div>
  );
}

type TrackHeroProps = {
  icon: string;
  label: string;
  title: string;
  description: string;
};

function TrackHero({
  icon,
  label,
  title,
  description,
}: TrackHeroProps) {
  return (
    <section className="rounded-3xl bg-blue-700 px-6 py-8 text-white sm:px-10 sm:py-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-4xl">
          {icon}
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
            {label}
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h1>

          <p className="mt-3 max-w-3xl leading-7 text-blue-100">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}

function Breadcrumb({ title }: { title: string }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
      <Link
        href="/student/resources"
        className="transition hover:text-blue-700"
      >
        Study Resources
      </Link>

      <span aria-hidden="true">/</span>

      <span className="font-medium text-slate-900">{title}</span>
    </nav>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
};

function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="text-4xl" aria-hidden="true">
        📚
      </div>

      <h3 className="mt-4 text-xl font-bold text-slate-900">{title}</h3>

      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}