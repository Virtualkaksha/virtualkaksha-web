import "server-only";

import type { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { STUDENT_READABLE_RESOURCE_WHERE } from "@/lib/resources/resource-access-policy";
import {
  buildBookmarkWhere,
  buildContinueLearningWhere,
  buildBookmarkPageArguments,
  buildContinueLearningPageArguments,
  type StudentLearningQuery,
} from "@/lib/resources/student-learning-query";

export const studentLearningResourceSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  format: true,
  contentUrl: true,
  externalUrl: true,
  thumbnailUrl: true,
  durationSeconds: true,
  pageCount: true,
  activeAssetId: true,
  activeAsset: { select: { id: true, status: true, isPrimary: true } },
  resourceType: { select: { name: true, code: true, iconName: true } },
  assets: {
    where: { isPrimary: true },
    select: { id: true, status: true, isPrimary: true },
  },
  chapter: {
    select: {
      name: true,
      slug: true,
      boardClassSubject: {
        select: {
          board: { select: { shortName: true, slug: true } },
          classLevel: { select: { name: true, slug: true } },
          subject: { select: { name: true, slug: true } },
        },
      },
    },
  },
  examTopic: {
    select: {
      name: true,
      slug: true,
      examSubject: {
        select: {
          exam: { select: { shortName: true, slug: true } },
          subject: { select: { name: true, slug: true } },
        },
      },
    },
  },
} satisfies Prisma.ResourceSelect;

export type StudentLearningResourceRecord = Prisma.ResourceGetPayload<{
  select: typeof studentLearningResourceSelect;
}>;

export function findStudentProfileIdByUserId(userId: string) {
  return prisma.studentProfile.findUnique({ where: { userId }, select: { id: true } });
}

export async function findStudentBookmarkPage(
  studentProfileId: string,
  query: StudentLearningQuery,
) {
  const where = buildBookmarkWhere(studentProfileId, STUDENT_READABLE_RESOURCE_WHERE);
  return prisma.$transaction(async (transaction) => {
    const total = await transaction.resourceBookmark.count({ where });
    const args = buildBookmarkPageArguments(studentProfileId, STUDENT_READABLE_RESOURCE_WHERE, query, total);
    const rows = await transaction.resourceBookmark.findMany({
      ...args.rows,
      select: { createdAt: true, resource: { select: studentLearningResourceSelect } },
    });
    return { rows, pagination: args.pagination };
  });
}

export async function findStudentContinueLearningPage(
  studentProfileId: string,
  query: StudentLearningQuery,
) {
  const where = buildContinueLearningWhere(studentProfileId, STUDENT_READABLE_RESOURCE_WHERE);
  return prisma.$transaction(async (transaction) => {
    const total = await transaction.studentResourceProgress.count({ where });
    const args = buildContinueLearningPageArguments(studentProfileId, STUDENT_READABLE_RESOURCE_WHERE, query, total);
    const rows = await transaction.studentResourceProgress.findMany({
      ...args.rows,
      select: {
        id: true,
        status: true,
        progressPercent: true,
        lastPosition: true,
        lastAccessedAt: true,
        updatedAt: true,
        resource: { select: studentLearningResourceSelect },
      },
    });
    return { rows, pagination: args.pagination };
  });
}

export function findStudentContinueLearningDashboard(
  studentProfileId: string,
  take = 6,
) {
  return prisma.studentResourceProgress.findMany({
    where: buildContinueLearningWhere(studentProfileId, STUDENT_READABLE_RESOURCE_WHERE),
    orderBy: [{ lastAccessedAt: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
    take,
    select: {
      id: true,
      status: true,
      progressPercent: true,
      lastPosition: true,
      lastAccessedAt: true,
      updatedAt: true,
      resource: { select: studentLearningResourceSelect },
    },
  });
}

export async function findBookmarkedResourceIds(
  studentProfileId: string,
  resourceIds: string[],
) {
  if (resourceIds.length === 0) return [];
  const rows = await prisma.resourceBookmark.findMany({
    where: {
      studentProfileId,
      resourceId: { in: resourceIds },
      resource: STUDENT_READABLE_RESOURCE_WHERE,
    },
    select: { resourceId: true },
  });
  return rows.map((row) => row.resourceId);
}

export async function isStudentResourceBookmarked(
  studentProfileId: string,
  resourceId: string,
) {
  const bookmark = await prisma.resourceBookmark.findFirst({
    where: {
      studentProfileId,
      resourceId,
      resource: STUDENT_READABLE_RESOURCE_WHERE,
    },
    select: { id: true },
  });
  return Boolean(bookmark);
}
