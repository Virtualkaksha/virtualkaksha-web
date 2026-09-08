import "server-only";

import type { Prisma, PublicationStatus } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import {
  buildClampedSearchPageArguments,
  buildTeacherResourceWhere,
  type TeacherResourceSearchQuery,
} from "@/lib/resources/resource-search-query";
import { TEACHER_MANAGED_STATUSES } from "@/lib/teacher/resource-management-policy";

export const teacherManagedResourceSelect = {
  id: true,
  title: true,
  format: true,
  access: true,
  status: true,
  externalUrl: true,
  createdAt: true,
  updatedAt: true,
  moderationNote: true,
  activeAssetId: true,
  activeAsset: { select: { status: true } },
  resourceType: { select: { name: true } },
  assets: {
    where: { isPrimary: true },
    orderBy: [{ updatedAt: "desc" as const }, { id: "asc" as const }],
    take: 1,
    select: { status: true },
  },
  chapter: {
    select: {
      name: true,
      boardClassSubject: {
        select: {
          board: { select: { shortName: true } },
          classLevel: { select: { name: true } },
          subject: { select: { name: true } },
        },
      },
    },
  },
  examTopic: {
    select: {
      name: true,
      examSubject: {
        select: {
          exam: { select: { shortName: true } },
          subject: { select: { name: true } },
        },
      },
    },
  },
} satisfies Prisma.ResourceSelect;

export const teacherManagedResourceDetailSelect = {
  ...teacherManagedResourceSelect,
  titleHindi: true,
  description: true,
  language: true,
  thumbnailUrl: true,
  pageCount: true,
  durationSeconds: true,
  chapterId: true,
  examTopicId: true,
  resourceTypeId: true,
  slug: true,
} satisfies Prisma.ResourceSelect;

export type TeacherManagedResourceRecord = Prisma.ResourceGetPayload<{
  select: typeof teacherManagedResourceSelect;
}>;

export async function findTeacherManagedResourcePage(userId: string, query: TeacherResourceSearchQuery) {
  const where = buildTeacherResourceWhere(userId, query);
  const total = await prisma.resource.count({ where });
  const args = buildClampedSearchPageArguments(where, query, total);
  const rows = await prisma.resource.findMany({
    ...args.rows,
    select: teacherManagedResourceSelect,
  });
  return { total, rows, page: args.pagination.page };
}

export function findTeacherManagedResource(resourceId: string, userId: string, allowAdminRead = false) {
  return prisma.resource.findFirst({
    where: {
      id: resourceId,
      ...(allowAdminRead ? {} : { createdByUserId: userId }),
      status: { in: [...TEACHER_MANAGED_STATUSES] },
    },
    select: teacherManagedResourceDetailSelect,
  });
}

export function findEditableTeacherManagedResource(resourceId: string, userId: string) {
  return prisma.resource.findFirst({
    where: { id: resourceId, createdByUserId: userId, status: { in: ["DRAFT", "REJECTED"] } },
    select: teacherManagedResourceDetailSelect,
  });
}

export async function findTeacherResourceEditOptions() {
  const [resourceTypes, chapters, examTopics] = await Promise.all([
    prisma.resourceType.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.chapter.findMany({ where: { isActive: true, boardClassSubject: { isActive: true, board: { isActive: true }, classLevel: { isActive: true }, subject: { isActive: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, boardClassSubject: { select: { board: { select: { shortName: true } }, classLevel: { select: { name: true } }, subject: { select: { name: true } } } } } }),
    prisma.examTopic.findMany({ where: { isActive: true, examSubject: { isActive: true, exam: { isActive: true }, subject: { isActive: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, examSubject: { select: { exam: { select: { shortName: true } }, subject: { select: { name: true } } } } } }),
  ]);
  return { resourceTypes, chapters, examTopics };
}

export async function updateTeacherManagedResourceMetadata(input: {
  resourceId: string;
  userId: string;
  resourceTypeId: string;
  chapterId: string | null;
  examTopicId: string | null;
  data: Prisma.ResourceUpdateManyMutationInput;
}) {
  const [current, resourceType, chapter, examTopic] = await Promise.all([
    prisma.resource.findFirst({ where: { id: input.resourceId, createdByUserId: input.userId, status: { in: ["DRAFT", "REJECTED"] } }, select: { slug: true } }),
    prisma.resourceType.findFirst({ where: { id: input.resourceTypeId, isActive: true }, select: { id: true } }),
    input.chapterId ? prisma.chapter.findFirst({ where: { id: input.chapterId, isActive: true, boardClassSubject: { isActive: true, board: { isActive: true }, classLevel: { isActive: true }, subject: { isActive: true } } }, select: { id: true } }) : null,
    input.examTopicId ? prisma.examTopic.findFirst({ where: { id: input.examTopicId, isActive: true, examSubject: { isActive: true, exam: { isActive: true }, subject: { isActive: true } } }, select: { id: true } }) : null,
  ]);
  if (!current) return { count: 0, reason: "NOT_FOUND_OR_INVALID_STATE" as const };
  if (!resourceType || (!chapter && !examTopic) || Boolean(chapter) === Boolean(examTopic)) return { count: 0, reason: "INVALID_REFERENCE" as const };
  const conflict = await prisma.resource.findFirst({
    where: {
      id: { not: input.resourceId },
      slug: current.slug,
      OR: [
        ...(input.chapterId ? [{ chapterId: input.chapterId }] : []),
        ...(input.examTopicId ? [{ examTopicId: input.examTopicId }] : []),
      ],
    },
    select: { id: true },
  });
  if (conflict) return { count: 0, reason: "SLUG_CONFLICT" as const };
  const result = await prisma.resource.updateMany({
    where: { id: input.resourceId, createdByUserId: input.userId, status: { in: ["DRAFT", "REJECTED"] } },
    data: { ...input.data, resourceTypeId: input.resourceTypeId, chapterId: input.chapterId, examTopicId: input.examTopicId, updatedAt: new Date() },
  });
  return { count: result.count, reason: result.count === 1 ? null : "NOT_FOUND_OR_INVALID_STATE" as const };
}

export function updateTeacherManagedResourceStatus(input: {
  resourceId: string;
  userId: string;
  allowedStatuses: PublicationStatus[];
  data: Prisma.ResourceUpdateManyMutationInput;
}) {
  return prisma.resource.updateMany({
    where: {
      id: input.resourceId,
      createdByUserId: input.userId,
      status: { in: input.allowedStatuses },
    },
    data: { ...input.data, updatedAt: new Date() },
  });
}
