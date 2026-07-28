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
        where: { isActive: true },
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
        where: { isActive: true },
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
        where: { status: "PUBLISHED" },
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
      classLevel: { isActive: true },
      subject: { isActive: true },
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
      subject: { select: { id: true } },
      _count: {
        select: {
          chapters: { where: { isActive: true } },
        },
      },
    },
  },
} satisfies Prisma.BoardSelect;

const boardClassSubjectCatalogSelect = {
  id: true,
  board: {
    select: {
      id: true,
      name: true,
      shortName: true,
      slug: true,
    },
  },
  classLevel: {
    select: {
      id: true,
      name: true,
      slug: true,
      numericLevel: true,
    },
  },
  subject: {
    select: {
      id: true,
      name: true,
      nameHindi: true,
      slug: true,
      description: true,
      iconUrl: true,
      sortOrder: true,
    },
  },
  _count: {
    select: {
      chapters: { where: { isActive: true } },
    },
  },
  chapters: {
    where: { isActive: true },
    select: {
      _count: {
        select: {
          resources: { where: { status: "PUBLISHED" } },
        },
      },
    },
  },
} satisfies Prisma.BoardClassSubjectSelect;


const subjectChapterCatalogSelect = {
  id: true,
  board: {
    select: { id: true, name: true, shortName: true, slug: true },
  },
  classLevel: {
    select: { id: true, name: true, slug: true, numericLevel: true },
  },
  subject: {
    select: {
      id: true,
      name: true,
      nameHindi: true,
      slug: true,
      description: true,
      iconUrl: true,
    },
  },
  chapters: {
    where: { isActive: true },
    orderBy: [
      { sortOrder: "asc" },
      { chapterNumber: "asc" },
      { name: "asc" },
    ],
    select: {
      id: true,
      name: true,
      nameHindi: true,
      slug: true,
      chapterNumber: true,
      description: true,
      sortOrder: true,
      _count: {
        select: {
          resources: { where: { status: "PUBLISHED" } },
        },
      },
      resources: {
        where: { status: "PUBLISHED" },
        select: {
          resourceType: {
            select: { id: true, name: true, slug: true, iconName: true },
          },
        },
      },
    },
  },
} satisfies Prisma.BoardClassSubjectSelect;

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

export type BoardClassSubjectCatalogRecord =
  Prisma.BoardClassSubjectGetPayload<{
    select: typeof boardClassSubjectCatalogSelect;
  }>;


export type SubjectChapterCatalogRecord =
  Prisma.BoardClassSubjectGetPayload<{
    select: typeof subjectChapterCatalogSelect;
  }>;

export async function findPublishedResourceCatalog() {
  const [boards, exams, resourceTypes] = await prisma.$transaction([
    prisma.board.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: boardSelect,
    }),
    prisma.exam.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: examSelect,
    }),
    prisma.resourceType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: resourceTypeSelect,
    }),
  ]);

  return { boards, exams, resourceTypes };
}

export function findBoardClassCatalogBySlug(
  boardSlug: string,
): Promise<BoardClassCatalogRecord | null> {
  return prisma.board.findFirst({
    where: { slug: boardSlug, isActive: true },
    select: boardClassCatalogSelect,
  });
}

export function findBoardClassSubjects(
  boardSlug: string,
  classSlug: string,
): Promise<BoardClassSubjectCatalogRecord[]> {
  return prisma.boardClassSubject.findMany({
    where: {
      isActive: true,
      board: { slug: boardSlug, isActive: true },
      classLevel: { slug: classSlug, isActive: true },
      subject: { isActive: true },
    },
    orderBy: [
      { subject: { sortOrder: "asc" } },
      { subject: { name: "asc" } },
    ],
    select: boardClassSubjectCatalogSelect,
  });
}

export function findSubjectChapterCatalog(
  boardSlug: string,
  classSlug: string,
  subjectSlug: string,
): Promise<SubjectChapterCatalogRecord | null> {
  return prisma.boardClassSubject.findFirst({
    where: {
      isActive: true,
      board: { slug: boardSlug, isActive: true },
      classLevel: { slug: classSlug, isActive: true },
      subject: { slug: subjectSlug, isActive: true },
    },
    select: subjectChapterCatalogSelect,
  });
}

