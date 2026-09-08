import "server-only";

import type { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { STUDENT_READABLE_RESOURCE_WHERE } from "@/lib/resources/resource-access-policy";

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
  externalUrl: true,
  activeAssetId: true,
  activeAsset: { select: { id: true, status: true, isPrimary: true } },
  resourceType: {
    select: {
      name: true,
      code: true,
      iconName: true,
    },
  },
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

  const recommendationContextWhere: Prisma.ResourceWhereInput = recommendationContext.boardId && recommendationContext.classLevelId
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
        };
  const recommendationWhere: Prisma.ResourceWhereInput = {
    AND: [STUDENT_READABLE_RESOURCE_WHERE, recommendationContextWhere],
  };
  const accessibleProgressWhere: Prisma.StudentResourceProgressWhereInput = {
    studentProfileId,
    resource: STUDENT_READABLE_RESOURCE_WHERE,
  };
  const accessibleBookmarkWhere: Prisma.ResourceBookmarkWhereInput = {
    studentProfileId,
    resource: STUDENT_READABLE_RESOURCE_WHERE,
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
  ] = await Promise.all([
    prisma.studentResourceProgress.count({
      where: {
        ...accessibleProgressWhere,
        status: "COMPLETED",
      },
    }),
    prisma.studentResourceProgress.count({
      where: {
        ...accessibleProgressWhere,
        status: "IN_PROGRESS",
      },
    }),
    prisma.resourceBookmark.count({
      where: {
        ...accessibleBookmarkWhere,
      },
    }),
    prisma.studentResourceProgress.count({
      where: {
        ...accessibleProgressWhere,
        status: "COMPLETED",
        completedAt: {
          gte: weekStartedAt,
        },
      },
    }),
    prisma.studentResourceProgress.findFirst({
      where: {
        ...accessibleProgressWhere,
        status: "IN_PROGRESS",
        lastAccessedAt: { not: null },
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
        ...accessibleProgressWhere,
        lastAccessedAt: {
          not: null,
        },
      },
      take: RECENT_RESOURCE_LIMIT,
      orderBy: [{ lastAccessedAt: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
      select: {
        status: true,
        progressPercent: true,
        lastPosition: true,
        lastAccessedAt: true,
        resource: {
          select: dashboardResourceSelect,
        },
      },
    }),
    prisma.resourceBookmark.findMany({
      where: {
        ...accessibleBookmarkWhere,
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
