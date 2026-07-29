import type { Prisma } from "@/app/generated/prisma/client";

export const STUDENT_LEARNING_PAGE_SIZE = 12;
export const STUDENT_LEARNING_MAX_PAGE = 10_000;

export type StudentLearningQuery = { page: number; pageSize: 12 };
export type StudentLearningSearchParams = Record<string, string | string[] | undefined>;

export function parseStudentLearningQuery(
  params: StudentLearningSearchParams,
): StudentLearningQuery {
  const value = Array.isArray(params.page) ? params.page[0] : params.page;
  if (!value || !/^[1-9]\d*$/.test(value)) {
    return { page: 1, pageSize: STUDENT_LEARNING_PAGE_SIZE };
  }
  const parsed = Number(value);
  return {
    page: Number.isSafeInteger(parsed)
      ? Math.min(parsed, STUDENT_LEARNING_MAX_PAGE)
      : 1,
    pageSize: STUDENT_LEARNING_PAGE_SIZE,
  };
}

export function buildStudentLearningPagination(
  total: number,
  requestedPage: number,
) {
  const totalPages = Math.max(1, Math.ceil(total / STUDENT_LEARNING_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  return {
    total,
    totalPages,
    page,
    pageSize: STUDENT_LEARNING_PAGE_SIZE,
    skip: (page - 1) * STUDENT_LEARNING_PAGE_SIZE,
  };
}

export function buildBookmarkWhere(
  studentProfileId: string,
  resourceWhere: Prisma.ResourceWhereInput,
): Prisma.ResourceBookmarkWhereInput {
  return { studentProfileId, resource: resourceWhere };
}

export function buildContinueLearningWhere(
  studentProfileId: string,
  resourceWhere: Prisma.ResourceWhereInput,
): Prisma.StudentResourceProgressWhereInput {
  return {
    studentProfileId,
    lastAccessedAt: { not: null },
    resource: resourceWhere,
  };
}

export function buildBookmarkPageArguments(
  studentProfileId: string,
  resourceWhere: Prisma.ResourceWhereInput,
  query: StudentLearningQuery,
  total: number,
) {
  const where = buildBookmarkWhere(studentProfileId, resourceWhere);
  const pagination = buildStudentLearningPagination(total, query.page);
  return {
    pagination,
    count: { where },
    rows: {
      where,
      orderBy: [{ createdAt: "desc" as const }, { id: "asc" as const }],
      skip: pagination.skip,
      take: pagination.pageSize,
    },
  };
}

export function buildContinueLearningPageArguments(
  studentProfileId: string,
  resourceWhere: Prisma.ResourceWhereInput,
  query: StudentLearningQuery,
  total: number,
) {
  const where = buildContinueLearningWhere(studentProfileId, resourceWhere);
  const pagination = buildStudentLearningPagination(total, query.page);
  return {
    pagination,
    count: { where },
    rows: {
      where,
      orderBy: [
        { lastAccessedAt: "desc" as const },
        { updatedAt: "desc" as const },
        { id: "asc" as const },
      ],
      skip: pagination.skip,
      take: pagination.pageSize,
    },
  };
}

function isHttpUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveStudentResumeHref(resource: {
  id: string;
  slug: string;
  format: string;
  externalUrl: string | null;
  hasReadyPrimaryAsset: boolean;
  chapter: null | {
    slug: string;
    boardClassSubject: {
      board: { slug: string };
      classLevel: { slug: string };
      subject: { slug: string };
    };
  };
  lastPosition?: number | null;
}) {
  if (resource.chapter) {
    const { board, classLevel, subject } = resource.chapter.boardClassSubject;
    return `/student/resources/${board.slug}/${classLevel.slug}/${subject.slug}/${resource.chapter.slug}/${resource.slug}`;
  }
  if (resource.format === "PDF" && resource.hasReadyPrimaryAsset) {
    const page = resource.lastPosition && resource.lastPosition > 1
      ? `#page=${Math.trunc(resource.lastPosition)}`
      : "";
    return `/api/student/resources/${resource.id}/asset${page}`;
  }
  return isHttpUrl(resource.externalUrl) ? resource.externalUrl! : "#";
}
