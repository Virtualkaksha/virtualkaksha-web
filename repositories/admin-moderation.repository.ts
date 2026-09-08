import "server-only";

import prisma from "@/lib/prisma";

export async function findAdminDashboardData() {
  const [pending, published, rejected, archived, teachers, students, recent] = await Promise.all([
    prisma.resource.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.resource.count({ where: { status: "PUBLISHED" } }),
    prisma.resource.count({ where: { status: "REJECTED" } }),
    prisma.resource.count({ where: { status: "ARCHIVED" } }),
    prisma.teacherProfile.count(),
    prisma.studentProfile.count(),
    prisma.resource.findMany({
      take: 8,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, title: true, status: true, updatedAt: true,
        resourceType: { select: { name: true } },
        createdBy: { select: { displayName: true, firstName: true, lastName: true } },
      },
    }),
  ]);
  return { pending, published, rejected, archived, teachers, students, recent };
}

export async function findModerationResources(status?: string, query?: string) {
  return prisma.resource.findMany({
    where: {
      status: status && status !== "ALL" ? status as never : undefined,
      OR: query ? [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { createdBy: { email: { contains: query, mode: "insensitive" } } },
      ] : undefined,
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true, title: true, status: true, format: true, access: true, createdAt: true, updatedAt: true,
      moderationNote: true,
      resourceType: { select: { name: true } },
      createdBy: { select: { displayName: true, firstName: true, lastName: true, email: true } },
      chapter: { select: { name: true, boardClassSubject: { select: {
        board: { select: { shortName: true } }, classLevel: { select: { name: true } }, subject: { select: { name: true } },
      } } } },
    },
  });
}

export async function findModerationResource(resourceId: string) {
  return prisma.resource.findUnique({
    where: { id: resourceId },
    select: {
      id: true, title: true, titleHindi: true, description: true, status: true, format: true, access: true,
      language: true, externalUrl: true, thumbnailUrl: true, textContent: true,
      durationSeconds: true, pageCount: true, createdAt: true, updatedAt: true, publishedAt: true,
      moderationNote: true, reviewedAt: true,
      activeAssetId: true,
      activeAsset: { select: { status: true } },
      assets: {
        where: { isPrimary: true },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 1,
        select: { status: true },
      },
      resourceType: { select: { name: true } },
      createdBy: { select: { displayName: true, firstName: true, lastName: true, email: true } },
      reviewedBy: { select: { displayName: true, firstName: true, lastName: true } },
      chapter: { select: { name: true, slug: true, boardClassSubject: { select: {
        board: { select: { shortName: true, slug: true } }, classLevel: { select: { name: true, slug: true } }, subject: { select: { name: true, slug: true } },
      } } } },
    },
  });
}
