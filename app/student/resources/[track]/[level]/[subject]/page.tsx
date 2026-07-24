import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/prisma";

type SubjectChaptersPageProps = {
  params: Promise<{
    track: string;
    level: string;
    subject: string;
  }>;
};

export default async function SubjectChaptersPage({
  params,
}: SubjectChaptersPageProps) {
  const { track, level, subject } = await params;

  const boardClassSubject = await prisma.boardClassSubject.findFirst({
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
        slug: subject,
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
        },
      },
      subject: {
        select: {
          name: true,
          slug: true,
          description: true,
        },
      },
      chapters: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          chapterNumber: true,
          description: true,
          sortOrder: true,
          _count: {
            select: {
              resources: {
                where: {
                  status: "PUBLISHED",
                },
              },
            },
          },
        },
        orderBy: [
          { sortOrder: "asc" },
          { chapterNumber: "asc" },
          { name: "asc" },
        ],
      },
    },
  });

  if (!boardClassSubject) notFound();

  const { board, classLevel, chapters } = boardClassSubject;
  const selectedSubject = boardClassSubject.subject;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/student/resources" className="transition hover:text-blue-700">Study Resources</Link>
        <span>/</span>
        <Link href={`/student/resources/${board.slug}`} className="transition hover:text-blue-700">{board.shortName}</Link>
        <span>/</span>
        <Link href={`/student/resources/${board.slug}/${classLevel.slug}`} className="transition hover:text-blue-700">{classLevel.name}</Link>
        <span>/</span>
        <span className="font-medium text-slate-900">{selectedSubject.name}</span>
      </nav>

      <section className="rounded-3xl bg-blue-700 px-6 py-8 text-white sm:px-10 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
          {board.shortName} • {classLevel.name}
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{selectedSubject.name}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-blue-100">
          {selectedSubject.description ?? `Explore chapter-wise ${selectedSubject.name} learning resources.`}
        </p>
      </section>

      <section>
        <p className="text-sm font-semibold text-blue-700">Select a chapter</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}
        </h2>

        {chapters.length > 0 ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {chapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/student/resources/${board.slug}/${classLevel.slug}/${selectedSubject.slug}/${chapter.slug}`}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-700">
                    {chapter.chapterNumber ?? "•"}
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {chapter._count.resources} {chapter._count.resources === 1 ? "Resource" : "Resources"}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{chapter.name}</h3>
                {chapter.description ? (
                  <p className="mt-3 text-sm leading-6 text-slate-600">{chapter.description}</p>
                ) : null}
                <p className="mt-5 text-sm font-semibold text-blue-700">
                  Open chapter <span aria-hidden="true">→</span>
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <div className="text-4xl">📚</div>
            <h3 className="mt-4 text-xl font-bold text-slate-900">Chapters not added yet</h3>
            <p className="mt-2 text-sm text-slate-600">
              Chapters will appear here after they are added to the database.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}