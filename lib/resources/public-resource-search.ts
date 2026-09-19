import "server-only";

import { findResourceSearchFacets, findStudentResourceSearchPage, type ResourceSearchRecord } from "@/repositories/resource-search.repository";
import { hasReadyActiveAsset } from "./active-asset";
import { formatStudentResourceTitle } from "./display-title";
import {
  PUBLIC_BOARD_SLUG,
  resolvePublicBrowseStep,
  withPublicBrowseDefaults,
} from "./public-browse";
import {
  getBoardClassCatalog,
  getClassSubjectCatalog,
  getSubjectChapterCatalog,
} from "./resource-catalog";
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

function toPublicItem(record: ResourceSearchRecord) {
  const school = record.chapter?.boardClassSubject;
  const detailUrl = record.chapter
    ? `/student/resources/${school!.board.slug}/${school!.classLevel.slug}/${school!.subject.slug}/${record.chapter.slug}/${record.slug}`
    : null;
  return {
    title: formatStudentResourceTitle(record.title),
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
  return {
    items: rows.map(toPublicItem),
    facets,
    pagination: buildSearchPagination(total, page, query.pageSize),
  };
}

export async function loadPublicCataloguePage(
  query: ResourceSearchQuery,
  preferred?: { boardSlug?: string; classSlug?: string } | null,
) {
  const browseQuery = withPublicBrowseDefaults(query, preferred);
  const step = resolvePublicBrowseStep(browseQuery);
  const boardSlug = browseQuery.track || PUBLIC_BOARD_SLUG;

  const [facets, searchPage, classCatalog, subjectCatalog, chapterCatalog] = await Promise.all([
    findResourceSearchFacets(),
    step === "resources" ? findStudentResourceSearchPage(browseQuery) : Promise.resolve(null),
    getBoardClassCatalog(boardSlug),
    browseQuery.level && !browseQuery.subject
      ? getClassSubjectCatalog(boardSlug, browseQuery.level)
      : Promise.resolve(null),
    browseQuery.level && browseQuery.subject
      ? getSubjectChapterCatalog(boardSlug, browseQuery.level, browseQuery.subject)
      : Promise.resolve(null),
  ]);

  const items = searchPage ? searchPage.rows.map(toPublicItem) : [];
  const pagination = searchPage
    ? buildSearchPagination(searchPage.total, searchPage.page, browseQuery.pageSize)
    : { total: 0, totalPages: 1, page: 1, pageSize: browseQuery.pageSize };

  return {
    query: browseQuery,
    step,
    facets,
    items,
    pagination,
    classCatalog,
    subjectCatalog,
    chapterCatalog,
  };
}
