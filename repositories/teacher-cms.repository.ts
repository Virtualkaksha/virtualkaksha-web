import "server-only";

import prisma from "@/lib/prisma";

export async function findTeacherWorkspace(userId: string) {
  const [teacherProfile, resourceTypes, chapters, resources] = await Promise.all([
    prisma.teacherProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        headline: true,
        verificationStatus: true,
        profileStatus: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
          },
        },
      },
    }),
    prisma.resourceType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, code: true },
    }),
    prisma.chapter.findMany({
      where: {
        isActive: true,
        boardClassSubject: {
          isActive: true,
          board: { isActive: true },
          classLevel: { isActive: true },
          subject: { isActive: true },
        },
      },
      orderBy: [
        { boardClassSubject: { board: { sortOrder: "asc" } } },
        { boardClassSubject: { classLevel: { numericLevel: "asc" } } },
        { boardClassSubject: { subject: { sortOrder: "asc" } } },
        { sortOrder: "asc" },
      ],
      select: {
        id: true,
        name: true,
        chapterNumber: true,
        boardClassSubject: {
          select: {
            board: { select: { shortName: true } },
            classLevel: { select: { name: true } },
            subject: { select: { name: true } },
          },
        },
      },
    }),
    prisma.resource.findMany({
      where: {
        OR: [
          { createdByUserId: userId },
          { teachers: { some: { teacherProfile: { userId } } } },
        ],
        status: { not: "ARCHIVED" },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        format: true,
        access: true,
        updatedAt: true,
        viewCount: true,
        moderationNote: true,
        resourceType: { select: { name: true } },
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
      },
    }),
  ]);

  return { teacherProfile, resourceTypes, chapters, resources };
}

export async function findEditableTeacherResource(resourceId: string, userId: string) {
  return prisma.resource.findFirst({
    where: {
      id: resourceId,
      status: { not: "ARCHIVED" },
      OR: [
        { createdByUserId: userId },
        { teachers: { some: { teacherProfile: { userId } } } },
      ],
    },
    select: {
      id: true,
      title: true,
      titleHindi: true,
      description: true,
      resourceTypeId: true,
      chapterId: true,
      language: true,
      format: true,
      access: true,
      status: true,
      contentUrl: true,
      externalUrl: true,
      thumbnailUrl: true,
      textContent: true,
      durationSeconds: true,
      pageCount: true,
      sortOrder: true,
    },
  });
}
