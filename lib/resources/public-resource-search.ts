import "server-only";

import { findResourceSearchFacets, findStudentResourceSearchPage, type ResourceSearchRecord } from "@/repositories/resource-search.repository";
import { hasReadyActiveAsset } from "./active-asset";
import { buildSearchPagination, resolveResourceSearchHref, type ResourceSearchQuery } from "./resource-search-query";

function academicLabel(record: ResourceSearchRecord) {
  if (record.chapter) {
    const mapping = record.chapter.boardClassSubject;
    return `${mapping.board.shortName} · ${mapping.classLevel.name} · ${mapping.subject.name} · ${record.chapter.name}`;
  }
  if (record.examTopic) {
    const mapping = record.examTopic.examSubject;
    return `${mapping.exam.shortName} · ${mapping.subject.name} · ${record.examTopic.name}`;
  }
  return "Published resource";
}

export type PublicResourceSearchItem = {
  title: string;
  description: string | null;
  format: string;
  resourceType: string;
  academicLabel: string;
  openHref: string;
};

export async function searchPublicResources(query: ResourceSearchQuery) {
  const [{ total, rows, page }, facets] = await Promise.all([
    findStudentResourceSearchPage(query),
    findResourceSearchFacets(),
  ]);
  const items: PublicResourceSearchItem[] = rows.map((record) => {
    const school = record.chapter?.boardClassSubject;
    const detailUrl = record.chapter
      ? `/student/resources/${school!.board.slug}/${school!.classLevel.slug}/${school!.subject.slug}/${record.chapter.slug}/${record.slug}`
      : null;
    return {
      title: record.title,
      description: record.description,
      format: record.format,
      resourceType: record.resourceType.name,
      academicLabel: academicLabel(record),
      openHref: resolveResourceSearchHref({
        id: record.id,
        format: record.format,
        externalUrl: record.externalUrl,
        hasReadyPrimaryAsset: hasReadyActiveAsset(record),
        detailUrl,
      }),
    };
  });
  return { items, facets, pagination: buildSearchPagination(total, page, query.pageSize) };
}
