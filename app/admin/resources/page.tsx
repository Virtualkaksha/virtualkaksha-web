import type { ReactNode } from "react";
import Link from "next/link";

import prisma from "@/lib/prisma";

import { createResource } from "./actions";

type AdminResourcesPageProps = {
  searchParams: Promise<{
    created?: string;
  }>;
};

const inputClassName =
  "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default async function AdminResourcesPage({
  searchParams,
}: AdminResourcesPageProps) {
  const { created } = await searchParams;

  const [resourceTypes, chapters, teachers, recentResources] = await Promise.all([
    prisma.resourceType.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
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

    prisma.chapter.findMany({
      where: {
        isActive: true,
        boardClassSubject: {
          isActive: true,
          board: {
            isActive: true,
          },
          classLevel: {
            isActive: true,
          },
          subject: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        chapterNumber: true,
        sortOrder: true,
        boardClassSubject: {
          select: {
            board: {
              select: {
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
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    }),

    prisma.teacherProfile.findMany({
      where: {
        isAvailable: true,
      },
      select: {
        id: true,
        headline: true,
        verificationStatus: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    }),

    prisma.resource.findMany({
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        format: true,
        access: true,
        resourceType: {
          select: {
            name: true,
          },
        },
        teachers: {
          orderBy: [
            { isPrimary: "desc" },
            { displayOrder: "asc" },
          ],
          select: {
            isPrimary: true,
            teacherProfile: {
              select: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    displayName: true,
                  },
                },
              },
            },
          },
        },
        chapter: {
          select: {
            name: true,
            slug: true,
            boardClassSubject: {
              select: {
                board: {
                  select: {
                    slug: true,
                  },
                },
                classLevel: {
                  select: {
                    slug: true,
                  },
                },
                subject: {
                  select: {
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const sortedTeachers = [...teachers].sort((first, second) => {
    const firstName =
      first.user.displayName ??
      [first.user.firstName, first.user.lastName].filter(Boolean).join(" ");

    const secondName =
      second.user.displayName ??
      [second.user.firstName, second.user.lastName].filter(Boolean).join(" ");

    return firstName.localeCompare(secondName);
  });

  const sortedChapters = chapters.sort((first, second) => {
    const firstBoard =
      first.boardClassSubject.board.shortName;

    const secondBoard =
      second.boardClassSubject.board.shortName;

    const boardComparison =
      firstBoard.localeCompare(secondBoard);

    if (boardComparison !== 0) {
      return boardComparison;
    }

    const classComparison =
      first.boardClassSubject.classLevel.numericLevel -
      second.boardClassSubject.classLevel.numericLevel;

    if (classComparison !== 0) {
      return classComparison;
    }

    const subjectComparison =
      first.boardClassSubject.subject.name.localeCompare(
        second.boardClassSubject.subject.name
      );

    if (subjectComparison !== 0) {
      return subjectComparison;
    }

    return first.sortOrder - second.sortOrder;
  });

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-blue-700">
            VirtualKaksha Admin
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Resource Management
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Add chapter notes, videos, questions and other learning
            resources.
          </p>
        </div>

        <Link
          href="/student/resources"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          View student resources
        </Link>
      </header>

      {created === "true" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
          Resource created successfully.
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-blue-700">
          Add New Resource
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Resource details
        </h2>

        {resourceTypes.length === 0 ||
        sortedChapters.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
            Resource create karne ke liye database me active chapters
            aur resource types hone chahiye.
          </div>
        ) : (
          <form action={createResource} className="mt-8 space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <FormField label="Chapter" required>
                <select
                  name="chapterId"
                  required
                  defaultValue=""
                  className={inputClassName}
                >
                  <option value="" disabled>
                    Select chapter
                  </option>

                  {sortedChapters.map((chapter) => {
                    const board =
                      chapter.boardClassSubject.board;

                    const classLevel =
                      chapter.boardClassSubject.classLevel;

                    const subject =
                      chapter.boardClassSubject.subject;

                    return (
                      <option key={chapter.id} value={chapter.id}>
                        {board.shortName} · {classLevel.name} ·{" "}
                        {subject.name} ·{" "}
                        {chapter.chapterNumber
                          ? `${chapter.chapterNumber}. `
                          : ""}
                        {chapter.name}
                      </option>
                    );
                  })}
                </select>
              </FormField>

              <FormField label="Resource type" required>
                <select
                  name="resourceTypeId"
                  required
                  defaultValue=""
                  className={inputClassName}
                >
                  <option value="" disabled>
                    Select resource type
                  </option>

                  {resourceTypes.map((resourceType) => (
                    <option
                      key={resourceType.id}
                      value={resourceType.id}
                    >
                      {resourceType.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Primary educator">
                <select
                  name="primaryTeacherProfileId"
                  defaultValue=""
                  className={inputClassName}
                >
                  <option value="">No educator linked</option>

                  {sortedTeachers.map((teacher) => {
                    const teacherName =
                      teacher.user.displayName ??
                      [teacher.user.firstName, teacher.user.lastName]
                        .filter(Boolean)
                        .join(" ");

                    return (
                      <option key={teacher.id} value={teacher.id}>
                        {teacherName}
                        {teacher.headline ? ` · ${teacher.headline}` : ""}
                        {teacher.verificationStatus === "VERIFIED"
                          ? " · Verified"
                          : ""}
                      </option>
                    );
                  })}
                </select>

                {teachers.length === 0 ? (
                  <span className="mt-2 block text-xs text-amber-700">
                    No educator profile exists yet. The resource can still be
                    created and linked later.
                  </span>
                ) : null}
              </FormField>

              <div className="hidden lg:block" aria-hidden="true" />

              <FormField label="Title" required>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="Life Processes Complete Notes"
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Hindi title">
                <input
                  name="titleHindi"
                  type="text"
                  placeholder="जीवन प्रक्रियाएँ सम्पूर्ण नोट्स"
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Language" required>
                <select
                  name="language"
                  required
                  defaultValue="ENGLISH"
                  className={inputClassName}
                >
                  <option value="ENGLISH">English</option>
                  <option value="HINDI">Hindi</option>
                </select>
              </FormField>

              <FormField label="Format" required>
                <select
                  name="format"
                  required
                  defaultValue="PDF"
                  className={inputClassName}
                >
                  <option value="PDF">PDF</option>
                  <option value="VIDEO">Video</option>
                  <option value="ARTICLE">Article</option>
                  <option value="IMAGE">Image</option>
                  <option value="DOCUMENT">Document</option>
                  <option value="EXTERNAL_LINK">
                    External Link
                  </option>
                  <option value="INTERACTIVE">
                    Interactive
                  </option>
                </select>
              </FormField>

              <FormField label="Access" required>
                <select
                  name="access"
                  required
                  defaultValue="FREE"
                  className={inputClassName}
                >
                  <option value="FREE">Free</option>
                  <option value="PREMIUM">Premium</option>
                  <option value="ENROLLED_ONLY">
                    Enrolled Students Only
                  </option>
                </select>
              </FormField>

              <FormField label="Status" required>
                <select
                  name="status"
                  required
                  defaultValue="PUBLISHED"
                  className={inputClassName}
                >
                  <option value="DRAFT">Draft</option>

                  <option value="PENDING_REVIEW">
                    Pending Review
                  </option>

                  <option value="PUBLISHED">
                    Published
                  </option>
                </select>
              </FormField>

              <FormField label="Content URL">
                <input
                  name="contentUrl"
                  type="url"
                  placeholder="https://example.com/notes.pdf"
                  className={inputClassName}
                />
              </FormField>

              <FormField label="External URL">
                <input
                  name="externalUrl"
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Thumbnail URL">
                <input
                  name="thumbnailUrl"
                  type="url"
                  placeholder="https://example.com/thumbnail.jpg"
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Page count">
                <input
                  name="pageCount"
                  type="number"
                  min="0"
                  placeholder="25"
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Video duration in minutes">
                <input
                  name="durationMinutes"
                  type="number"
                  min="0"
                  placeholder="45"
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Display order">
                <input
                  name="sortOrder"
                  type="number"
                  min="0"
                  defaultValue="0"
                  className={inputClassName}
                />
              </FormField>
            </div>

            <FormField label="Description">
              <textarea
                name="description"
                rows={4}
                placeholder="Describe this resource."
                className={inputClassName}
              />
            </FormField>

            <FormField label="Written content">
              <textarea
                name="textContent"
                rows={7}
                placeholder="Article ya written notes yahan paste kar sakte hain."
                className={inputClassName}
              />
            </FormField>

            <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Content URL, External URL ya Written Content me se kam se
              kam ek field bharna zaroori hai.
            </div>

            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Create Resource
            </button>
          </form>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900">
          Recently added resources
        </h2>

        {recentResources.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-600">
            Abhi tak koi resource create nahi hua hai.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-3">Title</th>
                  <th className="px-3 py-3">Chapter</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Educator</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Access</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {recentResources.map((resource) => {
                  const chapter = resource.chapter;

                  const chapterUrl = chapter
                    ? `/student/resources/${chapter.boardClassSubject.board.slug}/${chapter.boardClassSubject.classLevel.slug}/${chapter.boardClassSubject.subject.slug}/${chapter.slug}`
                    : null;

                  const resourceUrl = chapterUrl
                    ? `${chapterUrl}/${resource.slug}`
                    : null;

                  const primaryTeacher = resource.teachers[0]?.teacherProfile;
                  const primaryTeacherName = primaryTeacher
                    ? primaryTeacher.user.displayName ??
                      [
                        primaryTeacher.user.firstName,
                        primaryTeacher.user.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ")
                    : null;

                  return (
                    <tr
                      key={resource.id}
                      className="border-b border-slate-100"
                    >
                      <td className="px-3 py-4">
                        <p className="font-semibold text-slate-900">
                          {resource.title}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {resource.format.replace(/_/g, " ")}
                        </p>
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {chapter?.name ?? "No chapter"}
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {resource.resourceType.name}
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {primaryTeacherName ?? "Not linked"}
                      </td>

                      <td className="px-3 py-4">
                        <StatusBadge status={resource.status} />
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {resource.access.replace(/_/g, " ")}
                      </td>

                      <td className="px-3 py-4">
                        {resourceUrl && resource.status === "PUBLISHED" ? (
                          <Link
                            href={resourceUrl}
                            className="font-semibold text-blue-700 hover:text-blue-800"
                          >
                            Open resource
                          </Link>
                        ) : chapterUrl ? (
                          <Link
                            href={chapterUrl}
                            className="font-semibold text-blue-700 hover:text-blue-800"
                          >
                            View chapter
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required ? (
          <span className="text-red-600"> *</span>
        ) : null}
      </span>

      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  let className = "bg-slate-100 text-slate-700";

  if (status === "PUBLISHED") {
    className = "bg-emerald-50 text-emerald-700";
  }

  if (status === "PENDING_REVIEW") {
    className = "bg-amber-50 text-amber-700";
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}