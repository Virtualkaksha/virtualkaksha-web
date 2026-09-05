import "server-only";

import type { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import {
  buildClampedSearchPageArguments,
  buildStudentResourceWhere,
  buildTeacherDashboardWhere,
  buildTeacherResourceWhere,
  type ResourceSearchQuery,
  type TeacherResourceSearchQuery,
} from "@/lib/resources/resource-search-query";

export const resourceSearchSelect = {
  id: true,
  title: true,
  description: true,
  slug: true,
  format: true,
  access: true,
  status: true,
  externalUrl: true,
  thumbnailUrl: true,
  durationSeconds: true,
  pageCount: true,
  publishedAt: true,
  updatedAt: true,
  viewCount: true,
  moderationNote: true,
  activeAssetId: true,
  activeAsset: { select: { id: true, status: true } },
  resourceType: { select: { name: true, slug: true, code: true, iconName: true } },
  assets: {
    where: { isPrimary: true },
    select: { id: true, status: true },
  },
  chapter: {
    select: {
      name: true,
      slug: true,
      boardClassSubject: {
        select: {
          board: { select: { name: true, shortName: true, slug: true } },
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
          exam: { select: { name: true, shortName: true, slug: true } },
          subject: { select: { name: true, slug: true } },
        },
      },
    },
  },
  teachers: {
    orderBy: [{ isPrimary: "desc" as const }, { displayOrder: "asc" as const }],
    take: 2,
    select: {
      teacherProfile: {
        select: {
          user: { select: { displayName: true, firstName: true, lastName: true } },
        },
      },
    },
  },
} satisfies Prisma.ResourceSelect;

export type ResourceSearchRecord = Prisma.ResourceGetPayload<{ select: typeof resourceSearchSelect }>;

export async function findStudentResourceSearchPage(query: ResourceSearchQuery) {
  const where = buildStudentResourceWhere(query);
  return prisma.$transaction(async (transaction) => {
    const total = await transaction.resource.count({ where });
    const args = buildClampedSearchPageArguments(where, query, total);
    const rows = await transaction.resource.findMany({ ...args.rows, select: resourceSearchSelect });
    return { total, rows, page: args.pagination.page };
  });
}

export async function findTeacherResourceSearchPage(userId: string, query: TeacherResourceSearchQuery) {
  const where = buildTeacherResourceWhere(userId, query);
  return prisma.$transaction(async (transaction) => {
    const total = await transaction.resource.count({ where });
    const args = buildClampedSearchPageArguments(where, query, total);
    const rows = await transaction.resource.findMany({ ...args.rows, select: resourceSearchSelect });
    return { total, rows, page: args.pagination.page };
  });
}

export async function findResourceSearchFacets() {
  const [boards, exams, levels, subjects, chapters, examTopics, resourceTypes] = await prisma.$transaction([
    prisma.board.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { name: true, shortName: true, slug: true } }),
    prisma.exam.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { name: true, shortName: true, slug: true } }),
    prisma.classLevel.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { numericLevel: "asc" }], select: { name: true, slug: true } }),
    prisma.subject.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { name: true, slug: true } }),
    prisma.chapter.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { name: true, slug: true } }),
    prisma.examTopic.findMany({
      where: { isActive: true, examSubject: { isActive: true, exam: { isActive: true }, subject: { isActive: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { name: true, slug: true, examSubject: { select: { exam: { select: { slug: true } }, subject: { select: { name: true, slug: true } } } } },
    }),
    prisma.resourceType.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { name: true, slug: true } }),
  ]);
  return { boards, exams, levels, subjects, chapters, examTopics, resourceTypes };
}

export async function findTeacherResourceSummary(userId: string) {
  const ownershipWhere = buildTeacherDashboardWhere(userId);
  const [total, published, pending, drafts, rejected, views, recent] = await prisma.$transaction([
    prisma.resource.count({ where: ownershipWhere }),
    prisma.resource.count({ where: { AND: [ownershipWhere, { status: "PUBLISHED" }] } }),
    prisma.resource.count({ where: { AND: [ownershipWhere, { status: "PENDING_REVIEW" }] } }),
    prisma.resource.count({ where: { AND: [ownershipWhere, { status: "DRAFT" }] } }),
    prisma.resource.count({ where: { AND: [ownershipWhere, { status: "REJECTED" }] } }),
    prisma.resource.aggregate({ where: ownershipWhere, _sum: { viewCount: true } }),
    prisma.resource.findMany({ where: ownershipWhere, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 5, select: resourceSearchSelect }),
  ]);
  return { total, published, pending, drafts, rejected, views: views._sum.viewCount ?? 0, recent };
}

export async function findTeacherInbox(userId: string) {
  const ownershipWhere = buildTeacherDashboardWhere(userId);
  const recentlyPublishedSince = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [rejected, pending, recentlyPublished, rejectedCount, pendingCount] = await prisma.$transaction([
    prisma.resource.findMany({
      where: { AND: [ownershipWhere, { status: "REJECTED" }] },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 20,
      select: resourceSearchSelect,
    }),
    prisma.resource.findMany({
      where: { AND: [ownershipWhere, { status: "PENDING_REVIEW" }] },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 20,
      select: resourceSearchSelect,
    }),
    prisma.resource.findMany({
      where: {
        AND: [
          ownershipWhere,
          { status: "PUBLISHED" },
          {
            OR: [
              { publishedAt: { gte: recentlyPublishedSince } },
              { reviewedAt: { gte: recentlyPublishedSince } },
            ],
          },
        ],
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 10,
      select: resourceSearchSelect,
    }),
    prisma.resource.count({ where: { AND: [ownershipWhere, { status: "REJECTED" }] } }),
    prisma.resource.count({ where: { AND: [ownershipWhere, { status: "PENDING_REVIEW" }] } }),
  ]);

  return {
    rejected,
    pending,
    recentlyPublished,
    counts: {
      rejected: rejectedCount,
      pending: pendingCount,
      attention: rejectedCount + pendingCount,
    },
  };
}
