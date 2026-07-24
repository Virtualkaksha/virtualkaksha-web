import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/prisma";

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

  const boardClassSubjects = await prisma.boardClassSubject.findMany({
    where: {
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
        isActive: true,
      },
    },
    select: {
      id: true,
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
          numericLevel: true,
        },
      },
      subject: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          iconUrl: true,
          sortOrder: true,
        },
      },
      _count: {
        select: {
          chapters: {
            where: {
              isActive: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        subject: {
          sortOrder: "asc",
        },
      },
      {
        subject: {
          name: "asc",
        },
      },
    ],
  });

  if (boardClassSubjects.length === 0) {
    notFound();
  }

  const board = boardClassSubjects[0].board;
  const classLevel = boardClassSubjects[0].classLevel;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/student/resources" className="transition hover:text-blue-700">
          Study Resources
        </Link>

        <span>/</span>

        <Link
          href={`/student/resources/${board.slug}`}
          className="transition hover:text-blue-700"
        >
          {board.shortName}
        </Link>

        <span>/</span>

        <span className="font-medium text-slate-900">{classLevel.name}</span>
      </nav>

      <section className="rounded-3xl bg-blue-700 px-6 py-8 text-white sm:px-10 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
          {board.shortName} Learning Resources
        </p>

        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
          {classLevel.name} Subjects
        </h1>

        <p className="mt-3 max-w-3xl leading-7 text-blue-100">
          Select a subject to explore its chapters, notes, videos, solutions,
          questions and tests.
        </p>
      </section>

      <section>
        <p className="text-sm font-semibold text-blue-700">
          Select your subject
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Available subjects
        </h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {boardClassSubjects.map((item) => (
            <Link
              key={item.id}
              href={`/student/resources/${board.slug}/${classLevel.slug}/${item.subject.slug}`}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                  {item.subject.iconUrl ? (
                    <img
                      src={item.subject.iconUrl}
                      alt=""
                      className="h-7 w-7 object-contain"
                    />
                  ) : (
                    "📚"
                  )}
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {item._count.chapters}{" "}
                  {item._count.chapters === 1 ? "Chapter" : "Chapters"}
                </span>
              </div>

              <h3 className="mt-5 text-xl font-semibold text-slate-900">
                {item.subject.name}
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {item.subject.description ??
                  `Explore ${item.subject.name} chapters and learning resources.`}
              </p>

              <p className="mt-5 text-sm font-semibold text-blue-700">
                View chapters <span aria-hidden="true">→</span>
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}