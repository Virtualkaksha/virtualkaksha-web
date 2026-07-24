import "server-only";

import prisma from "@/lib/prisma";

const RECENT_RESOURCE_LIMIT = 6;
const RECOMMENDATION_LIMIT = 6;
const BOOKMARK_LIMIT = 6;
const WEEK_IN_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;

export type DashboardResource = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  format: string;
  access: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  pageCount: number | null;
  resourceType: {
    name: string;
    code: string;
    iconName: string | null;
  };
  subjectName: string | null;
  chapterName: string | null;
  href: string | null;
};

export type ContinueLearningItem = DashboardResource & {
  progressPercent: number;
  lastPosition: number | null;
  lastAccessedAt: Date | null;
};

export type RecentLearningItem = DashboardResource & {
  progressPercent: number;
  progressStatus: string;
  lastAccessedAt: Date | null;
};

export type StudentDashboardData = {
  student: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string | null;
    displayName: string;
    avatarUrl: string | null;
    board: {
      id: string;
      name: string;
      shortName: string;
      slug: string;
    } | null;
    classLevel: {
      id: string;
      name: string;
      slug: string;
      numericLevel: number;
    } | null;
    learningGoal: string | null;
  };
  stats: {
    completedResources: number;
    inProgressResources: number;
    bookmarkedResources: number;
    completedThisWeek: number;
  };
  continueLearning: ContinueLearningItem | null;
  recentlyViewed: RecentLearningItem[];
  bookmarks: DashboardResource[];
  recommendations: DashboardResource[];
};

export class StudentDashboardNotFoundError extends Error {
  constructor(userId: string) {
    super(`No student profile was found for user ${userId}.`);
    this.name = "StudentDashboardNotFoundError";
  }
}

type ResourceForDashboard = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  format: string;
  access: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  pageCount: number | null;
  resourceType: {
    name: string;
    code: string;
    iconName: string | null;
  };
  chapter: {
    name: string;
    slug: string;
    boardClassSubject: {
      board: {
        slug: string;
      };
      classLevel: {
        slug: string;
      };
      subject: {
        name: string;
        slug: string;
      };
    };
  } | null;
};

const dashboardResourceSelect = {
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
} as const;

function buildResourceHref(resource: ResourceForDashboard): string | null {
  if (!resource.chapter) {
    return null;
  }

  const { board, classLevel, subject } =
    resource.chapter.boardClassSubject;

  return [
    "/student/resources",
    board.slug,
    classLevel.slug,
    subject.slug,
    resource.chapter.slug,
    resource.slug,
  ].join("/");
}

function mapResource(resource: ResourceForDashboard): DashboardResource {
  return {
    id: resource.id,
    title: resource.title,
    slug: resource.slug,
    description: resource.description,
    format: resource.format,
    access: resource.access,
    thumbnailUrl: resource.thumbnailUrl,
    durationSeconds: resource.durationSeconds,
    pageCount: resource.pageCount,
    resourceType: resource.resourceType,
    subjectName: resource.chapter?.boardClassSubject.subject.name ?? null,
    chapterName: resource.chapter?.name ?? null,
    href: buildResourceHref(resource),
  };
}

function getDisplayName(user: {
  firstName: string;
  lastName: string | null;
  displayName: string | null;
}) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return user.displayName?.trim() || fullName;
}

export async function getStudentDashboard(
  userId: string,
): Promise<StudentDashboardData> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    throw new Error("A valid userId is required to load the student dashboard.");
  }

  const studentProfile = await prisma.studentProfile.findUnique({
    where: {
      userId: normalizedUserId,
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

  if (!studentProfile) {
    throw new StudentDashboardNotFoundError(normalizedUserId);
  }

  const weekStartedAt = new Date(Date.now() - WEEK_IN_MILLISECONDS);

  const recommendationWhere = {
    status: "PUBLISHED" as const,
    chapterId: {
      not: null,
    },
    ...(studentProfile.board && studentProfile.classLevel
      ? {
          chapter: {
            is: {
              isActive: true,
              boardClassSubject: {
                is: {
                  isActive: true,
                  boardId: studentProfile.board.id,
                  classLevelId: studentProfile.classLevel.id,
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
  ] = await Promise.all([
    prisma.studentResourceProgress.count({
      where: {
        studentProfileId: studentProfile.id,
        status: "COMPLETED",
      },
    }),
    prisma.studentResourceProgress.count({
      where: {
        studentProfileId: studentProfile.id,
        status: "IN_PROGRESS",
      },
    }),
    prisma.resourceBookmark.count({
      where: {
        studentProfileId: studentProfile.id,
      },
    }),
    prisma.studentResourceProgress.count({
      where: {
        studentProfileId: studentProfile.id,
        status: "COMPLETED",
        completedAt: {
          gte: weekStartedAt,
        },
      },
    }),
    prisma.studentResourceProgress.findFirst({
      where: {
        studentProfileId: studentProfile.id,
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
        studentProfileId: studentProfile.id,
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
        studentProfileId: studentProfile.id,
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

  const alreadyEngagedResourceIds = new Set([
    ...recentProgress.map((item) => item.resource.id),
    ...bookmarkRows.map((item) => item.resource.id),
    ...(continueLearningProgress
      ? [continueLearningProgress.resource.id]
      : []),
  ]);

  const recommendations = recommendationRows
    .filter((resource) => !alreadyEngagedResourceIds.has(resource.id))
    .map(mapResource);

  return {
    student: {
      id: studentProfile.id,
      userId: studentProfile.userId,
      firstName: studentProfile.user.firstName,
      lastName: studentProfile.user.lastName,
      displayName: getDisplayName(studentProfile.user),
      avatarUrl: studentProfile.user.avatarUrl,
      board: studentProfile.board,
      classLevel: studentProfile.classLevel,
      learningGoal: studentProfile.learningGoal,
    },
    stats: {
      completedResources,
      inProgressResources,
      bookmarkedResources,
      completedThisWeek,
    },
    continueLearning: continueLearningProgress
      ? {
          ...mapResource(continueLearningProgress.resource),
          progressPercent: continueLearningProgress.progressPercent,
          lastPosition: continueLearningProgress.lastPosition,
          lastAccessedAt: continueLearningProgress.lastAccessedAt,
        }
      : null,
    recentlyViewed: recentProgress.map((item) => ({
      ...mapResource(item.resource),
      progressPercent: item.progressPercent,
      progressStatus: item.status,
      lastAccessedAt: item.lastAccessedAt,
    })),
    bookmarks: bookmarkRows.map((item) => mapResource(item.resource)),
    recommendations,
  };
}
