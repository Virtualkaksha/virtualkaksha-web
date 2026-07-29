import "server-only";

import { getResourceSearchFacets, getTeacherResourceSummary, searchTeacherResources } from "@/lib/resources/resource-search";
import type { TeacherResourceSearchQuery } from "@/lib/resources/resource-search-query";
import { findTeacherWorkspaceMetadata } from "@/repositories/teacher-cms.repository";

function displayNameOf(data: Awaited<ReturnType<typeof findTeacherWorkspaceMetadata>>) {
  return data.teacherProfile
    ? data.teacherProfile.user.displayName ??
      [data.teacherProfile.user.firstName, data.teacherProfile.user.lastName]
        .filter(Boolean)
        .join(" ")
    : "Teacher";
}

export async function getTeacherCms(userId: string, query: TeacherResourceSearchQuery) {
  const [data, search, facets] = await Promise.all([
    findTeacherWorkspaceMetadata(userId),
    searchTeacherResources(userId, query),
    getResourceSearchFacets(),
  ]);
  return { ...data, displayName: displayNameOf(data), search, facets };
}

export async function getTeacherDashboardCms(userId: string) {
  const [data, summary] = await Promise.all([
    findTeacherWorkspaceMetadata(userId),
    getTeacherResourceSummary(userId),
  ]);
  return {
    ...data,
    displayName: displayNameOf(data),
    resources: summary.items,
    totals: {
      resources: summary.total,
      published: summary.published,
      pending: summary.pending,
      drafts: summary.drafts,
      views: summary.views,
    },
  };
}
