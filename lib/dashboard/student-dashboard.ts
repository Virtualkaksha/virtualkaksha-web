import "server-only";

import {
  findStudentDashboardProfileByUserId,
  getStudentDashboardSnapshot,
  type DashboardResourceRecord,
} from "@/repositories/student-dashboard.repository";
import { resolveStudentResumeHref } from "@/lib/resources/student-learning-query";
import { hasReadyActiveAsset } from "@/lib/resources/active-asset";

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
  academicLabel: string;
  href: string;
};

export type ContinueLearningItem = DashboardResource & {
  progressPercent: number;
  lastPosition: number | null;
  lastAccessedAt: Date | null;
};

export type RecentLearningItem = DashboardResource & {
  progressPercent: number;
  progressStatus: string;
  lastPosition: number | null;
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
  continueLearningItems: RecentLearningItem[];
  bookmarks: DashboardResource[];
  recommendations: DashboardResource[];
};

export class StudentDashboardNotFoundError extends Error {
  constructor(userId: string) {
    super(`No student profile was found for user ${userId}.`);
    this.name = "StudentDashboardNotFoundError";
  }
}

function mapResource(resource: DashboardResourceRecord, lastPosition?: number | null): DashboardResource {
  const school = resource.chapter?.boardClassSubject;
  const exam = resource.examTopic?.examSubject;
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
    subjectName: school?.subject.name ?? exam?.subject.name ?? null,
    chapterName: resource.chapter?.name ?? resource.examTopic?.name ?? null,
    academicLabel: [school?.subject.name ?? exam?.subject.name, resource.chapter?.name ?? resource.examTopic?.name].filter(Boolean).join(" · ") || "Learning resource",
    href: resolveStudentResumeHref({
      id: resource.id,
      slug: resource.slug,
      format: resource.format,
      externalUrl: resource.externalUrl,
      hasReadyPrimaryAsset: hasReadyActiveAsset(resource),
      chapter: resource.chapter,
      lastPosition,
    }),
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

  const studentProfile =
    await findStudentDashboardProfileByUserId(normalizedUserId);

  if (!studentProfile) {
    throw new StudentDashboardNotFoundError(normalizedUserId);
  }

  const snapshot = await getStudentDashboardSnapshot({
    studentProfileId: studentProfile.id,
    weekStartedAt: new Date(Date.now() - WEEK_IN_MILLISECONDS),
    recommendationContext: {
      boardId: studentProfile.board?.id ?? null,
      classLevelId: studentProfile.classLevel?.id ?? null,
    },
  });

  const alreadyEngagedResourceIds = new Set([
    ...snapshot.recentProgress.map((item) => item.resource.id),
    ...snapshot.bookmarkRows.map((item) => item.resource.id),
    ...(snapshot.continueLearningProgress
      ? [snapshot.continueLearningProgress.resource.id]
      : []),
  ]);

  const recommendations = snapshot.recommendationRows
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
      completedResources: snapshot.completedResources,
      inProgressResources: snapshot.inProgressResources,
      bookmarkedResources: snapshot.bookmarkedResources,
      completedThisWeek: snapshot.completedThisWeek,
    },
    continueLearning: snapshot.continueLearningProgress
      ? {
          ...mapResource(snapshot.continueLearningProgress.resource, snapshot.continueLearningProgress.lastPosition),
          progressPercent:
            snapshot.continueLearningProgress.progressPercent,
          lastPosition: snapshot.continueLearningProgress.lastPosition,
          lastAccessedAt:
            snapshot.continueLearningProgress.lastAccessedAt,
        }
      : null,
    recentlyViewed: snapshot.recentProgress.map((item) => ({
      ...mapResource(item.resource, item.lastPosition),
      progressPercent: item.progressPercent,
      progressStatus: item.status,
      lastPosition: item.lastPosition,
      lastAccessedAt: item.lastAccessedAt,
    })),
    continueLearningItems: snapshot.recentProgress.map((item) => ({
      ...mapResource(item.resource, item.lastPosition),
      progressPercent: item.progressPercent,
      progressStatus: item.status,
      lastPosition: item.lastPosition,
      lastAccessedAt: item.lastAccessedAt,
    })),
    bookmarks: snapshot.bookmarkRows.map((item) =>
      mapResource(item.resource),
    ),
    recommendations,
  };
}
