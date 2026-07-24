import "server-only";

import type { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";

const RECENT_RESOURCE_LIMIT = 6;
const RECOMMENDATION_LIMIT = 6;
const BOOKMARK_LIMIT = 6;

export const dashboardResourceSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  format: true,
  access: true,
  thumbnailUrl: true,
  durationSeconds: true,
  pageCount: true,
  resourceType: {
    select: {
      name: true,
      code: true,
      iconName: true,
    },
  },
  chapter: {
    select: {
      name: true,
      slug: true,
      boardClassSubject: {
        select: {
          board: {
            select: {
              slug: true,
            },
          },
          classLevel: {
            select: {
              slug: true,
            },
          },
          subject: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ResourceSelect;

export type DashboardResourceRecord = Prisma.ResourceGetPayload<{
  select: typeof dashboardResourceSelect;
}>;

export type StudentDashboardProfileRecord = Prisma.StudentProfileGetPayload<{
  select: {
    id: true;
    userId: true;
    learningGoal: true;
    user: {
      select: {
        firstName: true;
        lastName: true;
        displayName: true;
        avatarUrl: true;
      };
    };
    board: {
      select: {
        id: true;
        name: true;
        shortName: true;
        slug: true;
      };
    };
    classLevel: {
      select: {
        id: true;
        name: true;
        slug: true;
        numericLevel: true;
      };
    };
  };
}>;

export type DashboardRecommendationContext = {
  boardId: string | null;
  classLevelId: string | null;
};

export async function findStudentDashboardProfileByUserId(
  userId: string,
): Promise<StudentDashboardProfileRecord | null> {
  return prisma.studentProfile.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
      userId: true,
      learningGoal: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true,
        },
      },
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
    },
  });
}

export async function getStudentDashboardSnapshot(input: {
  studentProfileId: string;
  weekStartedAt: Date;
  recommendationContext: DashboardRecommendationContext;
}) {
  const { studentProfileId, weekStartedAt, recommendationContext } = input;

  const recommendationWhere: Prisma.ResourceWhereInput = {
    status: "PUBLISHED",
    chapterId: {
      not: null,
    },
    ...(recommendationContext.boardId && recommendationContext.classLevelId
      ? {
          chapter: {
            is: {
              isActive: true,
              boardClassSubject: {
                is: {
                  isActive: true,
                  boardId: recommendationContext.boardId,
                  classLevelId: recommendationContext.classLevelId,
                },
              },
            },
          },
        }
      : {
          isFeatured: true,
        }),
  };

  const [
    completedResources,
    inProgressResources,
    bookmarkedResources,
    completedThisWeek,
    continueLearningProgress,
    recentProgress,
    bookmarkRows,
    recommendationRows,
  ] = await prisma.$transaction([
    prisma.studentResourceProgress.count({
      where: {
        studentProfileId,
        status: "COMPLETED",
      },
    }),
    prisma.studentResourceProgress.count({
      where: {
        studentProfileId,
        status: "IN_PROGRESS",
      },
    }),
    prisma.resourceBookmark.count({
      where: {
        studentProfileId,
      },
    }),
    prisma.studentResourceProgress.count({
      where: {
        studentProfileId,
        status: "COMPLETED",
        completedAt: {
          gte: weekStartedAt,
        },
      },
    }),
    prisma.studentResourceProgress.findFirst({
      where: {
        studentProfileId,
        status: "IN_PROGRESS",
        resource: {
          status: "PUBLISHED",
        },
      },
      orderBy: [
        {
          lastAccessedAt: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],
      select: {
        progressPercent: true,
        lastPosition: true,
        lastAccessedAt: true,
        resource: {
          select: dashboardResourceSelect,
        },
      },
    }),
    prisma.studentResourceProgress.findMany({
      where: {
        studentProfileId,
        lastAccessedAt: {
          not: null,
        },
        resource: {
          status: "PUBLISHED",
        },
      },
      take: RECENT_RESOURCE_LIMIT,
      orderBy: {
        lastAccessedAt: "desc",
      },
      select: {
        status: true,
        progressPercent: true,
        lastAccessedAt: true,
        resource: {
          select: dashboardResourceSelect,
        },
      },
    }),
    prisma.resourceBookmark.findMany({
      where: {
        studentProfileId,
        resource: {
          status: "PUBLISHED",
        },
      },
      take: BOOKMARK_LIMIT,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        resource: {
          select: dashboardResourceSelect,
        },
      },
    }),
    prisma.resource.findMany({
      where: recommendationWhere,
      take: RECOMMENDATION_LIMIT,
      orderBy: [
        {
          isFeatured: "desc",
        },
        {
          publishedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: dashboardResourceSelect,
    }),
  ]);

  return {
    completedResources,
    inProgressResources,
    bookmarkedResources,
    completedThisWeek,
    continueLearningProgress,
    recentProgress,
    bookmarkRows,
    recommendationRows,
  };
}
