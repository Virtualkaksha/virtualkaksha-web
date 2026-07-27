import "server-only";

import type { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";

const boardSelect = {
  id: true,
  name: true,
  shortName: true,
  slug: true,
  description: true,
  boardType: true,
  stateName: true,
  sortOrder: true,
  _count: {
    select: {
      boardClassSubjects: {
        where: {
          isActive: true,
        },
      },
    },
  },
} satisfies Prisma.BoardSelect;

const examSelect = {
  id: true,
  name: true,
  shortName: true,
  slug: true,
  description: true,
  examType: true,
  sortOrder: true,
  _count: {
    select: {
      examSubjects: {
        where: {
          isActive: true,
        },
      },
    },
  },
} satisfies Prisma.ExamSelect;

const resourceTypeSelect = {
  id: true,
  name: true,
  nameHindi: true,
  code: true,
  slug: true,
  description: true,
  iconName: true,
  sortOrder: true,
  _count: {
    select: {
      resources: {
        where: {
          status: "PUBLISHED",
        },
      },
    },
  },
} satisfies Prisma.ResourceTypeSelect;

const boardClassCatalogSelect = {
  id: true,
  name: true,
  shortName: true,
  slug: true,
  description: true,
  boardType: true,
  stateName: true,
  boardClassSubjects: {
    where: {
      isActive: true,
      classLevel: {
        isActive: true,
      },
      subject: {
        isActive: true,
      },
    },
    select: {
      id: true,
      classLevel: {
        select: {
          id: true,
          name: true,
          slug: true,
          numericLevel: true,
          sortOrder: true,
        },
      },
      subject: {
        select: {
          id: true,
        },
      },
      _count: {
        select: {
          chapters: {
            where: {
              isActive: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.BoardSelect;

export type BoardCatalogRecord = Prisma.BoardGetPayload<{
  select: typeof boardSelect;
}>;

export type ExamCatalogRecord = Prisma.ExamGetPayload<{
  select: typeof examSelect;
}>;

export type ResourceTypeCatalogRecord = Prisma.ResourceTypeGetPayload<{
  select: typeof resourceTypeSelect;
}>;

export type BoardClassCatalogRecord = Prisma.BoardGetPayload<{
  select: typeof boardClassCatalogSelect;
}>;

export async function findPublishedResourceCatalog() {
  const [boards, exams, resourceTypes] = await prisma.$transaction([
    prisma.board.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: boardSelect,
    }),

    prisma.exam.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: examSelect,
    }),

    prisma.resourceType.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: resourceTypeSelect,
    }),
  ]);

  return {
    boards,
    exams,
    resourceTypes,
  };
}

export function findBoardClassCatalogBySlug(
  boardSlug: string,
): Promise<BoardClassCatalogRecord | null> {
  return prisma.board.findFirst({
    where: {
      slug: boardSlug,
      isActive: true,
    },
    select: boardClassCatalogSelect,
  });
}