import "server-only";

import {
  findResourceSearchFacets,
  findStudentResourceSearchPage,
  findTeacherResourceSearchPage,
  findTeacherResourceSummary,
  type ResourceSearchRecord,
} from "@/repositories/resource-search.repository";
import { buildSearchPagination, resolveResourceSearchHref, type ResourceSearchQuery, type TeacherResourceSearchQuery } from "./resource-search-query";
import { findBookmarkedResourceIds, findStudentProfileIdByUserId } from "@/repositories/student-learning.repository";
import { hasReadyActiveAsset } from "./active-asset";

function teacherName(record: ResourceSearchRecord) {
  const teacher = record.teachers[0]?.teacherProfile.user;
  return teacher?.displayName ?? ([teacher?.firstName, teacher?.lastName].filter(Boolean).join(" ") || null);
}

function mapResource(record: ResourceSearchRecord, bookmarked = false) {
  const school = record.chapter?.boardClassSubject;
  const exam = record.examTopic?.examSubject;
  const detailUrl = record.chapter
    ? `/student/resources/${school!.board.slug}/${school!.classLevel.slug}/${school!.subject.slug}/${record.chapter.slug}/${record.slug}`
    : null;
  const href = resolveResourceSearchHref({
    id: record.id,
    format: record.format,
    externalUrl: record.externalUrl,
    hasReadyPrimaryAsset: hasReadyActiveAsset(record),
    detailUrl,
  });
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    format: record.format,
    access: record.access,
    status: record.status,
    href,
    thumbnailUrl: record.thumbnailUrl,
    durationSeconds: record.durationSeconds,
    pageCount: record.pageCount,
    publishedAt: record.publishedAt,
    updatedAt: record.updatedAt,
    viewCount: record.viewCount,
    moderationNote: record.moderationNote,
    bookmarked,
    resourceType: record.resourceType,
    teacherName: teacherName(record),
    academicLabel: record.chapter
      ? `${school!.board.shortName} · ${school!.classLevel.name} · ${school!.subject.name} · ${record.chapter.name}`
      : record.examTopic
        ? `${exam!.exam.shortName} · ${exam!.subject.name} · ${record.examTopic.name}`
        : "Unmapped resource",
  };
}

export async function searchStudentResources(query: ResourceSearchQuery, userId?: string) {
  const [{ total, rows, page }, facets] = await Promise.all([
    findStudentResourceSearchPage(query),
    findResourceSearchFacets(),
  ]);
  const profile = userId ? await findStudentProfileIdByUserId(userId) : null;
  const bookmarkedIds = profile
    ? new Set(await findBookmarkedResourceIds(profile.id, rows.map((row) => row.id)))
    : new Set<string>();
  return { items: rows.map((row) => mapResource(row, bookmarkedIds.has(row.id))), facets, pagination: buildSearchPagination(total, page, query.pageSize) };
}

export async function searchTeacherResources(userId: string, query: TeacherResourceSearchQuery) {
  const { total, rows, page } = await findTeacherResourceSearchPage(userId, query);
  return { items: rows.map((row) => mapResource(row)), pagination: buildSearchPagination(total, page, query.pageSize) };
}

export function getResourceSearchFacets() {
  return findResourceSearchFacets();
}

export async function getTeacherResourceSummary(userId: string) {
  const summary = await findTeacherResourceSummary(userId);
  return { ...summary, items: summary.recent.map((row) => mapResource(row)) };
}

export type ResourceSearchResultItem = ReturnType<typeof mapResource>;
