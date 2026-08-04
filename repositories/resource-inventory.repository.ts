import "server-only";

import type { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";

export const resourceInventorySelect = {
  id: true,
  title: true,
  titleHindi: true,
  description: true,
  format: true,
  language: true,
  access: true,
  status: true,
  version: true,
  contentUrl: true,
  externalUrl: true,
  textContent: true,
  pageCount: true,
  fileSizeBytes: true,
  createdAt: true,
  updatedAt: true,
  resourceType: { select: { name: true } },
  createdBy: { select: { displayName: true, firstName: true, lastName: true } },
  chapter: { select: { name: true, boardClassSubject: { select: {
    board: { select: { shortName: true } },
    classLevel: { select: { name: true } },
    subject: { select: { name: true } },
  } } } },
  examTopic: { select: { name: true, examSubject: { select: {
    exam: { select: { shortName: true } },
    subject: { select: { name: true } },
  } } } },
  assets: {
    where: { isPrimary: true },
    orderBy: [{ updatedAt: "desc" as const }, { id: "asc" as const }],
    take: 1,
    select: { status: true, checksum: true },
  },
  _count: { select: { bookmarks: true, progress: true } },
} satisfies Prisma.ResourceSelect;

export type ResourceInventoryRecord = Prisma.ResourceGetPayload<{ select: typeof resourceInventorySelect }>;

export async function findResourceInventoryDuplicateInputs() {
  const [titles, checksums] = await prisma.$transaction([
    prisma.resource.findMany({ select: { id: true, title: true } }),
    prisma.resourceAsset.findMany({ where: { checksum: { not: null } }, select: { resourceId: true, checksum: true } }),
  ]);
  return { titles, checksums };
}

export async function findResourceInventoryPage(where: Prisma.ResourceWhereInput, page: number, pageSize: number) {
  return prisma.$transaction(async (transaction) => {
    const total = await transaction.resource.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const rows = await transaction.resource.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      select: resourceInventorySelect,
    });
    return { rows, total, page: safePage, pageSize, totalPages };
  });
}

export function findResourceInventoryExport(where: Prisma.ResourceWhereInput, maximum: number) {
  return prisma.resource.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take: maximum,
    select: resourceInventorySelect,
  });
}

export async function findResourceInventoryFacets() {
  const [boards, levels, subjects, resourceTypes] = await prisma.$transaction([
    prisma.board.findMany({ orderBy: { shortName: "asc" }, select: { slug: true, shortName: true } }),
    prisma.classLevel.findMany({ orderBy: { numericLevel: "asc" }, select: { slug: true, name: true } }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
    prisma.resourceType.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);
  return { boards, levels, subjects, resourceTypes };
}
