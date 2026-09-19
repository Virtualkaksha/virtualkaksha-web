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

const SEARCH_STOP_TOKENS = new Set(["pdf", "doc", "docx", "ppt", "pptx"]);

const SCHOOL_SUBJECT_ALIASES: Record<string, string[]> = {
  chemistry: ["science"],
  physics: ["science"],
  biology: ["science"],
};

export function relatedSubjectSlugs(subject: string) {
  const normalized = subject.trim().toLowerCase();
  return normalized ? [normalized, ...(SCHOOL_SUBJECT_ALIASES[normalized] ?? [])] : [];
}

export function searchTokens(q: string) {
  const tokens = q
    .replace(/[_\-.]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !SEARCH_STOP_TOKENS.has(token.toLowerCase()));
  return [...new Set(tokens)].slice(0, 8);
}

function containsInsensitive(value: string): Prisma.StringFilter {
  return { contains: value, mode: "insensitive" };
}

function tokenPredicate(token: string): Prisma.ResourceWhereInput {
  const contains = containsInsensitive(token);
  return {
    OR: [
      { title: contains },
      { titleHindi: contains },
      { description: contains },
      { slug: contains },
      { resourceType: { is: { OR: [{ name: contains }, { slug: contains }] } } },
      { chapter: { is: { OR: [{ name: contains }, { slug: contains }] } } },
      { chapter: { is: { boardClassSubject: { is: { subject: { is: { name: contains } } } } } } },
      { examTopic: { is: { OR: [{ name: contains }, { slug: contains }] } } },
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

function textPredicate(q: string): Prisma.ResourceWhereInput | null {
  if (!q) return null;
  const tokens = searchTokens(q);
  if (tokens.length === 0) return tokenPredicate(q);
  if (tokens.length === 1) return tokenPredicate(tokens[0]);
  return { AND: tokens.map(tokenPredicate) };
}

function activeName(requireActive: boolean) {
  return requireActive ? { isActive: true } : {};
}

function subjectRelation(subject: string, requireActive: boolean) {
  const slugs = relatedSubjectSlugs(subject);
  return {
    subject: {
      is: {
        ...(slugs.length > 1 ? { slug: { in: slugs } } : { slug: slugs[0] ?? subject }),
        ...activeName(requireActive),
      },
    },
  };
}

function boardAcademicPredicate(
  query: Pick<ResourceSearchQuery, "track" | "level" | "subject" | "chapter">,
  requireActive: boolean,
): Prisma.ResourceWhereInput {
  const { track, level, subject, chapter } = query;
  return {
    chapter: {
      is: {
        ...(chapter ? { slug: chapter } : {}),
        ...activeName(requireActive),
        boardClassSubject: {
          is: {
            ...activeName(requireActive),
            ...(track ? { board: { is: { slug: track, ...activeName(requireActive) } } } : {}),
            ...(level ? { classLevel: { is: { slug: level, ...activeName(requireActive) } } } : {}),
            ...(!chapter && subject ? subjectRelation(subject, requireActive) : {}),
          },
        },
      },
    },
  };
}

function examAcademicPredicate(
  query: Pick<ResourceSearchQuery, "track" | "subject" | "chapter">,
  requireActive: boolean,
): Prisma.ResourceWhereInput {
  const { track, subject, chapter } = query;
  return {
    examTopic: {
      is: {
        ...(chapter ? { slug: chapter } : {}),
        ...activeName(requireActive),
        examSubject: {
          is: {
            ...activeName(requireActive),
            ...(track ? { exam: { is: { slug: track, ...activeName(requireActive) } } } : {}),
            ...(!chapter && subject ? subjectRelation(subject, requireActive) : {}),
          },
        },
      },
    },
  };
}

function academicPredicate(query: Pick<ResourceSearchQuery, "track" | "trackType" | "level" | "subject" | "chapter">, requireActive: boolean): Prisma.ResourceWhereInput | null {
  const { track, trackType, level, subject, chapter } = query;
  if (!track && !level && !subject && !chapter) return null;
  if (trackType === "EXAM") return examAcademicPredicate(query, requireActive);
  if (trackType === "BOARD") return boardAcademicPredicate(query, requireActive);
  if (track) return { OR: [boardAcademicPredicate(query, requireActive), examAcademicPredicate(query, requireActive)] };
  return boardAcademicPredicate(query, requireActive);
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
      { createdByUserId: userId },
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
      { createdByUserId: userId },
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

export type ChapterFacet = {
  name: string;
  slug: string;
  boardClassSubject?: {
    board: { slug: string };
    classLevel: { slug: string };
    subject: { name: string; slug: string };
  };
};

export type ExamTopicFacet = {
  name: string;
  slug: string;
  examSubject: { exam: { slug: string }; subject: { name: string; slug: string } };
};

export function getAcademicUnitOptions(
  query: Pick<ResourceSearchQuery, "trackType" | "track" | "level" | "subject">,
  facets: { chapters: ChapterFacet[]; examTopics: ExamTopicFacet[] },
) {
  if (query.trackType === "EXAM") {
    return {
      label: "Topic" as const,
      options: facets.examTopics.filter((item) =>
        (!query.track || item.examSubject.exam.slug === query.track) &&
        (!query.subject || relatedSubjectSlugs(query.subject).includes(item.examSubject.subject.slug))),
    };
  }
  const subjectSlugs = query.subject ? relatedSubjectSlugs(query.subject) : [];
  return {
    label: "Chapter" as const,
    options: facets.chapters.filter((item) => {
      const mapping = item.boardClassSubject;
      if (!mapping) return true;
      if (query.track && mapping.board.slug !== query.track) return false;
      if (query.level && mapping.classLevel.slug !== query.level) return false;
      if (subjectSlugs.length && !subjectSlugs.includes(mapping.subject.slug)) return false;
      return true;
    }),
  };
}
