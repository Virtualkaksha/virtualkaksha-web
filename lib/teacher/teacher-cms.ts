import "server-only";

import { getResourceSearchFacets, getTeacherResourceSummary } from "@/lib/resources/resource-search";
import type { TeacherResourceSearchQuery } from "@/lib/resources/resource-search-query";
import { getTeacherManagedResources } from "@/lib/teacher/resource-management";
import {
  findTeacherInbox,
  type ResourceSearchRecord,
} from "@/repositories/resource-search.repository";
import { findTeacherWorkspaceMetadata } from "@/repositories/teacher-cms.repository";

function displayNameOf(data: Awaited<ReturnType<typeof findTeacherWorkspaceMetadata>>) {
  return data.teacherProfile
    ? data.teacherProfile.user.displayName ??
      [data.teacherProfile.user.firstName, data.teacherProfile.user.lastName]
        .filter(Boolean)
        .join(" ")
    : "Teacher";
}

function mapInboxItem(record: ResourceSearchRecord) {
  const school = record.chapter?.boardClassSubject;
  const exam = record.examTopic?.examSubject;
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    moderationNote: record.moderationNote,
    updatedAt: record.updatedAt,
    publishedAt: record.publishedAt,
    resourceTypeName: record.resourceType.name,
    academicLabel: record.chapter
      ? `${school!.board.shortName} · ${school!.classLevel.name} · ${school!.subject.name} · ${record.chapter.name}`
      : record.examTopic
        ? `${exam!.exam.shortName} · ${exam!.subject.name} · ${record.examTopic.name}`
        : "Unmapped resource",
  };
}

export async function getTeacherCms(userId: string, query: TeacherResourceSearchQuery) {
  const [data, search, facets] = await Promise.all([
    findTeacherWorkspaceMetadata(userId),
    getTeacherManagedResources(userId, query),
    getResourceSearchFacets(),
  ]);
  return { ...data, displayName: displayNameOf(data), search, facets };
}

export async function getTeacherDashboardCms(userId: string) {
  const [data, summary, inbox] = await Promise.all([
    findTeacherWorkspaceMetadata(userId),
    getTeacherResourceSummary(userId),
    findTeacherInbox(userId),
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
      rejected: summary.rejected,
      views: summary.views,
      attention: inbox.counts.attention,
    },
    inbox: {
      counts: inbox.counts,
      rejected: inbox.rejected.map(mapInboxItem),
      pending: inbox.pending.map(mapInboxItem),
      recentlyPublished: inbox.recentlyPublished.map(mapInboxItem),
    },
  };
}

export async function getTeacherInboxCms(userId: string) {
  const [data, inbox] = await Promise.all([
    findTeacherWorkspaceMetadata(userId),
    findTeacherInbox(userId),
  ]);
  return {
    displayName: displayNameOf(data),
    counts: inbox.counts,
    rejected: inbox.rejected.map(mapInboxItem),
    pending: inbox.pending.map(mapInboxItem),
    recentlyPublished: inbox.recentlyPublished.map(mapInboxItem),
  };
}

export async function getTeacherNavBadge(userId: string) {
  const inbox = await findTeacherInbox(userId);
  return inbox.counts;
}
