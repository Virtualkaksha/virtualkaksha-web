import type { Prisma } from "@/app/generated/prisma/client";
import {
  STUDENT_RESOURCE_ACCESS,
  STUDENT_READABLE_RESOURCE_WHERE,
} from "./resource-access-policy";

export const RESOURCE_SEARCH_PAGE_SIZE = 12;
export const RESOURCE_SEARCH_MAX_PAGE_SIZE = 48;
export const RESOURCE_SEARCH_QUERY_MAX_LENGTH = 100;
export const RESOURCE_SEARCH_MAX_PAGE = 10_000;

export type SearchSort = "relevance" | "newest" | "alphabetical";
export type TrackType = "BOARD" | "EXAM";
export type TeacherSearchStatus =
  | "ALL"
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "REJECTED"
  | "ARCHIVED";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export type ResourceSearchQuery = {
  q: string;
  track: string;
  trackType: TrackType | null;
  level: string;
  subject: string;
  chapter: string;
  type: string;
  access: "FREE";
  sort: SearchSort;
  page: number;
  pageSize: number;
};

export type TeacherResourceSearchQuery = Omit<ResourceSearchQuery, "access"> & {
  status: TeacherSearchStatus;
};

function scalar(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function text(value: string | string[] | undefined, maximum = 100) {
  return scalar(value).trim().slice(0, maximum);
}

function positiveInteger(value: string | string[] | undefined, fallback: number, maximum?: number) {
  const raw = scalar(value);
  if (!/^[1-9]\d*$/.test(raw)) return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) return fallback;
  return maximum ? Math.min(parsed, maximum) : parsed;
}

function parseSort(value: string | string[] | undefined): SearchSort {
  const normalized = scalar(value).toLowerCase();
  return normalized === "newest" || normalized === "alphabetical" ? normalized : "relevance";
}

function parseTrackType(value: string | string[] | undefined): TrackType | null {
  const normalized = scalar(value).toUpperCase();
  return normalized === "BOARD" || normalized === "EXAM" ? normalized : null;
}

export function parseStudentSearchQuery(params: RawSearchParams): ResourceSearchQuery {
  return {
    q: text(params.q, RESOURCE_SEARCH_QUERY_MAX_LENGTH),
    track: text(params.track),
    trackType: parseTrackType(params.trackType),
    level: text(params.level),
    subject: text(params.subject),
    chapter: text(params.chapter),
    type: text(params.type),
    access: STUDENT_RESOURCE_ACCESS,
    sort: parseSort(params.sort),
    page: positiveInteger(params.page, 1, RESOURCE_SEARCH_MAX_PAGE),
    pageSize: positiveInteger(params.pageSize, RESOURCE_SEARCH_PAGE_SIZE, RESOURCE_SEARCH_MAX_PAGE_SIZE),
  };
}

export function parseTeacherSearchQuery(params: RawSearchParams): TeacherResourceSearchQuery {
  const base = parseStudentSearchQuery(params);
  const candidate = scalar(params.status).toUpperCase();
  const statuses: TeacherSearchStatus[] = ["ALL", "DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "ARCHIVED"];
  return {
    q: base.q,
    track: base.track,
    trackType: base.trackType,
    level: base.level,
    subject: base.subject,
    chapter: base.chapter,
    type: base.type,
    sort: base.sort,
    page: base.page,
    pageSize: RESOURCE_SEARCH_PAGE_SIZE,
    status: statuses.includes(candidate as TeacherSearchStatus) ? candidate as TeacherSearchStatus : "ALL",
  };
}

function textPredicate(q: string): Prisma.ResourceWhereInput | null {
  if (!q) return null;
  const contains = { contains: q, mode: "insensitive" as const };
  return {
    OR: [
      { title: contains },
      { titleHindi: contains },
      { description: contains },
      { chapter: { is: { name: contains } } },
      { chapter: { is: { boardClassSubject: { is: { subject: { is: { name: contains } } } } } } },
      { examTopic: { is: { name: contains } } },
      { examTopic: { is: { examSubject: { is: { subject: { is: { name: contains } } } } } } },
      {
        teachers: {
          some: {
            teacherProfile: {
              is: {
                user: {
                  is: {
                    OR: [
                      { displayName: contains },
                      { firstName: contains },
                      { lastName: contains },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    ],
  };
}

function academicPredicate(query: Pick<ResourceSearchQuery, "track" | "trackType" | "level" | "subject" | "chapter">, requireActive: boolean): Prisma.ResourceWhereInput | null {
  const { track, trackType, level, subject, chapter } = query;
  if (!track && !level && !subject && !chapter) return null;
  if (track && !trackType) return { id: "__ambiguous_track_requires_track_type__" };

  if (trackType === "EXAM") {
    return {
      examTopic: {
        is: {
          ...(chapter ? { slug: chapter } : {}),
          ...(requireActive ? { isActive: true } : {}),
          examSubject: {
            is: {
              ...(requireActive ? { isActive: true } : {}),
              ...(track ? { exam: { is: { slug: track, ...(requireActive ? { isActive: true } : {}) } } } : {}),
              ...(subject ? { subject: { is: { slug: subject, ...(requireActive ? { isActive: true } : {}) } } } : {}),
            },
          },
        },
      },
    };
  }

  return {
    chapter: {
      is: {
        ...(chapter ? { slug: chapter } : {}),
        ...(requireActive ? { isActive: true } : {}),
        boardClassSubject: {
          is: {
            ...(requireActive ? { isActive: true } : {}),
            ...(track ? { board: { is: { slug: track, ...(requireActive ? { isActive: true } : {}) } } } : {}),
            ...(level ? { classLevel: { is: { slug: level, ...(requireActive ? { isActive: true } : {}) } } } : {}),
            ...(subject ? { subject: { is: { slug: subject, ...(requireActive ? { isActive: true } : {}) } } } : {}),
          },
        },
      },
    },
  };
}

export function buildStudentResourceWhere(query: ResourceSearchQuery): Prisma.ResourceWhereInput {
  const search = textPredicate(query.q);
  const academic = academicPredicate(query, true);
  return {
    AND: [
      STUDENT_READABLE_RESOURCE_WHERE,
      ...(search ? [search] : []),
      ...(academic ? [academic] : []),
      ...(query.type ? [{ resourceType: { is: { slug: query.type, isActive: true } } }] : []),
    ],
  };
}

export function buildTeacherResourceWhere(userId: string, query: TeacherResourceSearchQuery): Prisma.ResourceWhereInput {
  const statusPredicate: Prisma.ResourceWhereInput = query.status === "ALL"
    ? {}
    : { status: query.status };
  const search = textPredicate(query.q);
  const academic = academicPredicate(query, false);
  return {
    AND: [
      {
        OR: [
          { createdByUserId: userId },
          { teachers: { some: { teacherProfile: { is: { userId } } } } },
        ],
      },
      statusPredicate,
      ...(search ? [search] : []),
      ...(academic ? [academic] : []),
      ...(query.type ? [{ resourceType: { is: { slug: query.type } } }] : []),
    ],
  };
}

export function buildTeacherDashboardWhere(userId: string): Prisma.ResourceWhereInput {
  return {
    AND: [
      {
        OR: [
          { createdByUserId: userId },
          { teachers: { some: { teacherProfile: { is: { userId } } } } },
        ],
      },
      { status: { not: "ARCHIVED" } },
    ],
  };
}

export function buildResourceOrderBy(sort: SearchSort): Prisma.ResourceOrderByWithRelationInput[] {
  if (sort === "newest") return [{ publishedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }];
  if (sort === "alphabetical") return [{ title: "asc" }, { id: "asc" }];
  return [{ isFeatured: "desc" }, { sortOrder: "asc" }, { publishedAt: "desc" }, { id: "asc" }];
}

export function buildSearchPageArguments(where: Prisma.ResourceWhereInput, query: Pick<ResourceSearchQuery, "page" | "pageSize" | "sort">) {
  return {
    count: { where },
    rows: {
      where,
      orderBy: buildResourceOrderBy(query.sort),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    },
  };
}

export function buildClampedSearchPageArguments(where: Prisma.ResourceWhereInput, query: Pick<ResourceSearchQuery, "page" | "pageSize" | "sort">, total: number) {
  const pagination = buildSearchPagination(total, query.page, query.pageSize);
  return {
    pagination,
    rows: buildSearchPageArguments(where, { ...query, page: pagination.page }).rows,
  };
}

export function buildSearchPagination(total: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { total, totalPages, page: Math.min(page, totalPages), pageSize };
}

export function buildResourceSearchUrl(pathname: string, query: ResourceSearchQuery | TeacherResourceSearchQuery, page: number) {
  const params = new URLSearchParams();
  const values: Record<string, string | number | null> = {
    q: query.q,
    track: query.track,
    trackType: query.trackType,
    level: query.level,
    subject: query.subject,
    chapter: query.chapter,
    type: query.type,
    sort: query.sort,
    page,
    pageSize: query.pageSize,
    ...( "status" in query ? { status: query.status } : { access: "FREE" }),
  };
  for (const [key, value] of Object.entries(values)) {
    if (value !== "" && value !== null) params.set(key, String(value));
  }
  return `${pathname}?${params.toString()}`;
}

function isExternalHttpUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveResourceSearchHref(resource: {
  id: string;
  format: string;
  externalUrl: string | null;
  hasReadyPrimaryAsset: boolean;
  detailUrl?: string | null;
}) {
  if (resource.format === "PDF") {
    if (resource.hasReadyPrimaryAsset) return resource.detailUrl ?? "#";
    return isExternalHttpUrl(resource.externalUrl) ? resource.externalUrl! : "#";
  }
  if (resource.detailUrl) return resource.detailUrl;
  if (isExternalHttpUrl(resource.externalUrl)) return resource.externalUrl!;
  return "#";
}

export type ExamTopicFacet = {
  name: string;
  slug: string;
  examSubject: { exam: { slug: string }; subject: { name: string; slug: string } };
};

export function getAcademicUnitOptions(
  query: Pick<ResourceSearchQuery, "trackType" | "track" | "subject">,
  facets: { chapters: Array<{ name: string; slug: string }>; examTopics: ExamTopicFacet[] },
) {
  if (query.trackType !== "EXAM") return { label: "Chapter" as const, options: facets.chapters };
  return {
    label: "Topic" as const,
    options: facets.examTopics.filter((item) =>
      (!query.track || item.examSubject.exam.slug === query.track) &&
      (!query.subject || item.examSubject.subject.slug === query.subject)),
  };
}
