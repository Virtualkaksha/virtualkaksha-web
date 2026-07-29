import "server-only";

import {
  findResourceSearchFacets,
  findStudentResourceSearchPage,
  findTeacherResourceSearchPage,
  findTeacherResourceSummary,
  type ResourceSearchRecord,
} from "@/repositories/resource-search.repository";
import { buildSearchPagination, resolveResourceSearchHref, type ResourceSearchQuery, type TeacherResourceSearchQuery } from "./resource-search-query";

function teacherName(record: ResourceSearchRecord) {
  const teacher = record.teachers[0]?.teacherProfile.user;
  return teacher?.displayName ?? ([teacher?.firstName, teacher?.lastName].filter(Boolean).join(" ") || null);
}

function mapResource(record: ResourceSearchRecord) {
  const school = record.chapter?.boardClassSubject;
  const exam = record.examTopic?.examSubject;
  const detailUrl = record.chapter
    ? `/student/resources/${school!.board.slug}/${school!.classLevel.slug}/${school!.subject.slug}/${record.chapter.slug}/${record.slug}`
    : null;
  const href = resolveResourceSearchHref({
    id: record.id,
    format: record.format,
    contentUrl: record.contentUrl,
    externalUrl: record.externalUrl,
    hasReadyPrimaryAsset: record.assets.some((asset) => asset.status === "READY"),
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
    resourceType: record.resourceType,
    teacherName: teacherName(record),
    academicLabel: record.chapter
      ? `${school!.board.shortName} · ${school!.classLevel.name} · ${school!.subject.name} · ${record.chapter.name}`
      : record.examTopic
        ? `${exam!.exam.shortName} · ${exam!.subject.name} · ${record.examTopic.name}`
        : "Unmapped resource",
  };
}

export async function searchStudentResources(query: ResourceSearchQuery) {
  const [{ total, rows, page }, facets] = await Promise.all([
    findStudentResourceSearchPage(query),
    findResourceSearchFacets(),
  ]);
  return { items: rows.map(mapResource), facets, pagination: buildSearchPagination(total, page, query.pageSize) };
}

export async function searchTeacherResources(userId: string, query: TeacherResourceSearchQuery) {
  const { total, rows, page } = await findTeacherResourceSearchPage(userId, query);
  return { items: rows.map(mapResource), pagination: buildSearchPagination(total, page, query.pageSize) };
}

export function getResourceSearchFacets() {
  return findResourceSearchFacets();
}

export async function getTeacherResourceSummary(userId: string) {
  const summary = await findTeacherResourceSummary(userId);
  return { ...summary, items: summary.recent.map(mapResource) };
}

export type ResourceSearchResultItem = ReturnType<typeof mapResource>;
