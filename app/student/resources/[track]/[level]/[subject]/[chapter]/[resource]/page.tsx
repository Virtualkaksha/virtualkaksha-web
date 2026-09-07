import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/prisma";
import { STUDENT_READABLE_RESOURCE_WHERE } from "@/lib/resources/resource-access-policy";
import { findStudentProfileIdByUserId, isStudentResourceBookmarked } from "@/repositories/student-learning.repository";
import StudentPdfViewer from "@/components/student/StudentPdfViewer";
import { getCurrentIdentity } from "@/lib/auth/current-identity";
import {
  getStudentResourceProgress,
  resolveStudentResourceDownloadUrl,
  resolveStudentResourceViewerState,
} from "@/lib/resources/student-resource-service";
import { resolveActiveAsset } from "@/lib/resources/active-asset";
import { resolveVideoEmbed, VIDEO_FRAME_REFERRER_POLICY } from "@/lib/resources/video-embed";

import ResourceActions from "./ResourceActions";

type ResourceViewerPageProps = {
  params: Promise<{
    track: string;
    level: string;
    subject: string;
    chapter: string;
    resource: string;
  }>;
};

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

function ResourceContent({
  resource,
  viewerState,
  pageCount,
  initialPage,
  enableProgressTracking,
}: {
  resource: {
    id: string;
    title: string;
    format:
      | "PDF"
      | "VIDEO"
      | "ARTICLE"
      | "IMAGE"
      | "DOCUMENT"
      | "EXTERNAL_LINK"
      | "INTERACTIVE";
    contentUrl: string | null;
    externalUrl: string | null;
    textContent: string | null;
  };
  viewerState: ReturnType<typeof resolveStudentResourceViewerState>;
  pageCount: number | null;
  initialPage: number | null;
  enableProgressTracking: boolean;
}) {
  const sourceUrl = resource.contentUrl ?? resource.externalUrl;

  if (resource.format === "ARTICLE" && resource.textContent) {
    return (
      <article className="prose prose-slate max-w-none whitespace-pre-wrap">
        {resource.textContent}
      </article>
    );
  }

  if (resource.format === "IMAGE" && sourceUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={sourceUrl}
        alt={resource.title}
        className="mx-auto max-h-[75vh] w-auto rounded-2xl object-contain"
      />
    );
  }

  if (resource.format === "VIDEO" && sourceUrl) {
    const embedUrl = resolveVideoEmbed(sourceUrl)?.embedUrl ?? null;

    if (embedUrl) {
      return (
        <div className="aspect-video overflow-hidden rounded-2xl bg-black">
          <iframe
            src={embedUrl}
            title={resource.title}
            className="h-full w-full"
            // Without a referrer the player refuses to configure itself.
            referrerPolicy={VIDEO_FRAME_REFERRER_POLICY}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }

    if (resource.contentUrl) {
      return (
        <video
          controls
          preload="metadata"
          className="aspect-video w-full rounded-2xl bg-black"
        >
          <source src={resource.contentUrl} />
          Your browser does not support this video.
        </video>
      );
    }
  }

  if (resource.format === "PDF" && viewerState.viewerType === "native") {
    return (
      <StudentPdfViewer
        key={resource.id}
        resourceId={resource.id}
        viewerState={viewerState}
        initialPage={initialPage}
        pageCount={pageCount}
        enableProgressTracking={enableProgressTracking}
      />
    );
  }

  if (
    sourceUrl &&
    ["PDF", "DOCUMENT", "INTERACTIVE"].includes(resource.format)
  ) {
    return (
      <div className="space-y-3">
        {resource.format === "PDF" ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            This PDF is hosted externally, so page progress cannot be tracked automatically.
          </p>
        ) : null}
        <iframe
          src={sourceUrl}
          title={resource.title}
          className="h-[72vh] min-h-[560px] w-full rounded-2xl border border-slate-200 bg-white"
        />
      </div>
    );
  }

  if (sourceUrl) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
        <div className="text-4xl">🔗</div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">
          This resource opens on an external website
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Use the button below to open the verified learning resource in a new
          tab.
        </p>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          Open external resource
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
      <div className="text-4xl">📚</div>
      <h2 className="mt-4 text-xl font-bold text-slate-900">
        Resource content is being prepared
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        The resource is published, but its learning file or content has not
        been attached yet.
      </p>
    </div>
  );
}

export default async function ResourceViewerPage({
  params,
}: ResourceViewerPageProps) {
  const { track, level, subject, chapter, resource } = await params;

  const selectedResource = await prisma.resource.findFirst({
    where: {
      AND: [
        STUDENT_READABLE_RESOURCE_WHERE,
        {
          slug: resource,
          chapter: {
            slug: chapter,
            boardClassSubject: {
              board: { slug: track },
              classLevel: { slug: level },
              subject: { slug: subject },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      format: true,
      status: true,
      language: true,
      access: true,
      contentUrl: true,
      externalUrl: true,
      thumbnailUrl: true,
      textContent: true,
      activeAssetId: true,
      activeAsset: { select: { id: true, status: true, isPrimary: true } },
      assets: {
        where: {
          isPrimary: true,
          status: "READY",
        },
        select: {
          id: true,
          status: true,
          isPrimary: true,
        },
      },
      durationSeconds: true,
      pageCount: true,
      fileSizeBytes: true,
      updatedAt: true,
      resourceType: {
        select: {
          name: true,
          code: true,
        },
      },
      chapter: {
        select: {
          id: true,
          name: true,
          slug: true,
          chapterNumber: true,
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
              bio: true,
              yearsOfExperience: true,
              teachingMode: true,
              verificationStatus: true,
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
  });

  if (!selectedResource?.chapter) {
    notFound();
  }

  const chapterSlug = selectedResource.chapter.slug;
  const { board, classLevel, subject: selectedSubject } =
    selectedResource.chapter.boardClassSubject;

  const relatedResources = await prisma.resource.findMany({
    where: {
      AND: [
        STUDENT_READABLE_RESOURCE_WHERE,
        { chapterId: selectedResource.chapter.id, id: { not: selectedResource.id } },
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      format: true,
      access: true,
      resourceType: {
        select: {
          name: true,
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
    take: 6,
  });

  const currentUser = await getCurrentIdentity();
  const studentProfile = currentUser?.roles.includes("STUDENT")
    ? await findStudentProfileIdByUserId(currentUser.id)
    : null;
  const initialBookmarked = studentProfile
    ? await isStudentResourceBookmarked(studentProfile.id, selectedResource.id)
    : false;
  const progressResult = currentUser
    ? await getStudentResourceProgress({
        user: currentUser,
        resourceId: selectedResource.id,
      })
    : { ok: false as const, code: "NOT_FOUND" as const, message: "Progress unavailable." };
  const viewerState = resolveStudentResourceViewerState({
    resource: {
      id: selectedResource.id,
      status: selectedResource.status,
      format: selectedResource.format,
      contentUrl: selectedResource.contentUrl,
      externalUrl: selectedResource.externalUrl,
      access: selectedResource.access,
    },
    asset: resolveActiveAsset(selectedResource),
  });
  const downloadUrl = resolveStudentResourceDownloadUrl({
    resource: {
      id: selectedResource.id,
      status: selectedResource.status,
      format: selectedResource.format,
      contentUrl: selectedResource.contentUrl,
      externalUrl: selectedResource.externalUrl,
      access: selectedResource.access,
    },
    asset: resolveActiveAsset(selectedResource),
  });
  const duration = formatDuration(selectedResource.durationSeconds);
  const fileSize =
    selectedResource.fileSizeBytes !== null
      ? `${(Number(selectedResource.fileSizeBytes) / 1024 / 1024).toFixed(1)} MB`
      : null;

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
        <Link
          href={`/student/resources/${board.slug}/${classLevel.slug}/${selectedSubject.slug}/${selectedResource.chapter.slug}`}
          className="transition hover:text-blue-700"
        >
          {selectedResource.chapter.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-slate-900">
          {selectedResource.title}
        </span>
      </nav>

      <section className="rounded-3xl bg-blue-700 px-6 py-8 text-white sm:px-10 sm:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
              {selectedResource.resourceType.name} · {board.shortName} ·{" "}
              {classLevel.name}
            </p>

            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
              {selectedResource.title}
            </h1>

            {selectedResource.description ? (
              <p className="mt-4 max-w-3xl leading-7 text-blue-100">
                {selectedResource.description}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                {selectedResource.format.replaceAll("_", " ")}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                {selectedResource.language}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                {selectedResource.access}
              </span>
              {duration ? (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                  {duration}
                </span>
              ) : null}
              {selectedResource.pageCount ? (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                  {selectedResource.pageCount} pages
                </span>
              ) : null}
              {fileSize ? (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                  {fileSize}
                </span>
              ) : null}
            </div>
          </div>

          <ResourceActions
            title={selectedResource.title}
            downloadUrl={downloadUrl}
            resourceId={selectedResource.id}
            initialBookmarked={initialBookmarked}
            showBookmark={Boolean(studentProfile)}
          />
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <ResourceContent
            resource={{
              id: selectedResource.id,
              title: selectedResource.title,
              format: selectedResource.format,
              contentUrl: selectedResource.contentUrl,
              externalUrl: selectedResource.externalUrl,
              textContent: selectedResource.textContent,
            }}
            viewerState={viewerState}
            pageCount={selectedResource.pageCount}
            initialPage={progressResult.ok ? progressResult.progress.page : null}
            enableProgressTracking={Boolean(studentProfile)}
          />
        </main>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">Chapter</p>
            <h2 className="mt-2 text-lg font-bold text-slate-900">
              {selectedResource.chapter.chapterNumber
                ? `Chapter ${selectedResource.chapter.chapterNumber}: `
                : ""}
              {selectedResource.chapter.name}
            </h2>
            <Link
              href={`/student/resources/${board.slug}/${classLevel.slug}/${selectedSubject.slug}/${selectedResource.chapter.slug}`}
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 transition hover:text-blue-800"
            >
              View all chapter resources →
            </Link>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">Educators</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              Resource teachers
            </h2>

            {selectedResource.teachers.length > 0 ? (
              <div className="mt-5 space-y-4">
                {selectedResource.teachers.map(({ id, teacherProfile }) => {
                  const teacherName =
                    teacherProfile.user.displayName ??
                    [
                      teacherProfile.user.firstName,
                      teacherProfile.user.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ");

                  return (
                    <article
                      key={id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-center gap-3">
                        {teacherProfile.user.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={teacherProfile.user.avatarUrl}
                            alt={teacherName}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700">
                            {teacherProfile.user.firstName
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-slate-900">
                            {teacherName}
                          </h3>
                          {teacherProfile.verificationStatus === "VERIFIED" ? (
                            <p className="mt-0.5 text-xs font-semibold text-emerald-700">
                              Verified educator
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {teacherProfile.headline ? (
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {teacherProfile.headline}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {teacherProfile.yearsOfExperience !== null ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {teacherProfile.yearsOfExperience} years
                          </span>
                        ) : null}
                        {teacherProfile.teachingMode ? (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {teacherProfile.teachingMode}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-slate-600">
                No educator is linked to this resource yet.
              </p>
            )}
          </section>
        </aside>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-blue-700">
          Continue Learning
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Related resources
        </h2>

        {relatedResources.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {relatedResources.map((relatedResource) => (
              <Link
                key={relatedResource.id}
                href={`/student/resources/${board.slug}/${classLevel.slug}/${selectedSubject.slug}/${chapterSlug}/${relatedResource.slug}`}
                className="rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  {relatedResource.resourceType.name}
                </p>
                <h3 className="mt-2 font-semibold text-slate-900">
                  {relatedResource.title}
                </h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {relatedResource.format.replaceAll("_", " ")}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {relatedResource.access}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-slate-600">
            No other published resources are available for this chapter yet.
          </p>
        )}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/student/resources/${board.slug}/${classLevel.slug}/${selectedSubject.slug}/${chapterSlug}`}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          ← Back to chapter
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
