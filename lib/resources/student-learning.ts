import { revalidatePath } from "next/cache";

import type { Prisma } from "@/app/generated/prisma/client";
import { STUDENT_READABLE_RESOURCE_WHERE } from "./resource-access-policy";
import type { StudentLearningResourceRecord } from "@/repositories/student-learning.repository";
import { resolveStudentResumeHref, type StudentLearningQuery } from "./student-learning-query";
import type { StudentUser } from "./student-resource-service";

type BookmarkPrismaClient = {
  studentProfile: {
    findUnique: (args: { where: { userId: string }; select: { id: true } }) => Promise<{ id: string } | null>;
  };
  resource: {
    findFirst: (args: { where: Prisma.ResourceWhereInput; select: { id: true } }) => Promise<{ id: string } | null>;
  };
  resourceBookmark: {
    upsert: (args: Record<string, unknown>) => Promise<unknown>;
    deleteMany: (args: Record<string, unknown>) => Promise<unknown>;
  };
};

export type BookmarkMutationResult =
  | { ok: true; resourceId: string; bookmarked: boolean }
  | { ok: false; code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND"; message: string };

export function mapStudentLearningResource(
  resource: StudentLearningResourceRecord,
  progress?: { status: string; progressPercent: number; lastPosition: number | null; lastAccessedAt: Date | null },
) {
  const school = resource.chapter?.boardClassSubject;
  const exam = resource.examTopic?.examSubject;
  const hasReadyPrimaryAsset = resource.assets.some((asset) => asset.status === "READY" && asset.isPrimary);
  return {
    id: resource.id,
    title: resource.title,
    description: resource.description,
    format: resource.format,
    thumbnailUrl: resource.thumbnailUrl,
    durationSeconds: resource.durationSeconds,
    pageCount: resource.pageCount,
    resourceType: resource.resourceType,
    academicLabel: resource.chapter
      ? `${school!.board.shortName} · ${school!.classLevel.name} · ${school!.subject.name} · ${resource.chapter.name}`
      : resource.examTopic
        ? `${exam!.exam.shortName} · ${exam!.subject.name} · ${resource.examTopic.name}`
        : "Learning resource",
    subjectName: school?.subject.name ?? exam?.subject.name ?? null,
    unitName: resource.chapter?.name ?? resource.examTopic?.name ?? null,
    href: resolveStudentResumeHref({
      id: resource.id,
      slug: resource.slug,
      format: resource.format,
      externalUrl: resource.externalUrl,
      hasReadyPrimaryAsset,
      chapter: resource.chapter,
      lastPosition: progress?.lastPosition,
    }),
    progress: progress
      ? {
          status: progress.status,
          percent: Math.min(100, Math.max(0, progress.progressPercent)),
          lastPosition: progress.lastPosition,
          lastAccessedAt: progress.lastAccessedAt,
        }
      : null,
  };
}

async function revalidateBookmarkPaths() {
  try {
    revalidatePath("/student");
    revalidatePath("/student/bookmarks");
    revalidatePath("/student/resources/search");
  } catch {
    // Tests call the service outside the Next.js request runtime.
  }
}

export async function mutateStudentBookmark({
  user,
  resourceId,
  bookmarked,
  prismaClient,
}: {
  user: StudentUser | null | undefined;
  resourceId: string;
  bookmarked: boolean;
  prismaClient?: BookmarkPrismaClient;
}): Promise<BookmarkMutationResult> {
  if (!user?.id) {
    return { ok: false, code: "UNAUTHENTICATED", message: "Please sign in to save resources." };
  }
  if (!user.roles.includes("STUDENT")) {
    return { ok: false, code: "FORBIDDEN", message: "Student access is required." };
  }
  if (!resourceId || resourceId.length > 191) {
    return { ok: false, code: "NOT_FOUND", message: "Resource not found." };
  }

  const runtimePrisma = (prismaClient ?? (await import("@/lib/prisma").then((module) => module.default)) as unknown) as BookmarkPrismaClient;
  const studentProfile = await runtimePrisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!studentProfile) {
    return { ok: false, code: "FORBIDDEN", message: "A student profile is required." };
  }
  const resource = await runtimePrisma.resource.findFirst({
    where: { AND: [{ id: resourceId }, STUDENT_READABLE_RESOURCE_WHERE] },
    select: { id: true },
  });
  if (!resource) {
    return { ok: false, code: "NOT_FOUND", message: "Resource not found." };
  }

  const key = { studentProfileId_resourceId: { studentProfileId: studentProfile.id, resourceId } };
  if (bookmarked) {
    await runtimePrisma.resourceBookmark.upsert({
      where: key,
      update: {},
      create: { studentProfileId: studentProfile.id, resourceId },
    });
  } else {
    await runtimePrisma.resourceBookmark.deleteMany({
      where: { studentProfileId: studentProfile.id, resourceId },
    });
  }
  await revalidateBookmarkPaths();
  return { ok: true, resourceId, bookmarked };
}

export async function getStudentBookmarks(userId: string, query: StudentLearningQuery) {
  const { findStudentBookmarkPage, findStudentProfileIdByUserId } = await import("@/repositories/student-learning.repository");
  const profile = await findStudentProfileIdByUserId(userId);
  if (!profile) return null;
  const result = await findStudentBookmarkPage(profile.id, query);
  return { items: result.rows.map((row) => mapStudentLearningResource(row.resource)), pagination: result.pagination };
}

export async function getStudentContinueLearning(userId: string, query: StudentLearningQuery) {
  const { findStudentContinueLearningPage, findStudentProfileIdByUserId } = await import("@/repositories/student-learning.repository");
  const profile = await findStudentProfileIdByUserId(userId);
  if (!profile) return null;
  const result = await findStudentContinueLearningPage(profile.id, query);
  return {
    items: result.rows.map((row) => mapStudentLearningResource(row.resource, row)),
    pagination: result.pagination,
  };
}

export async function getStudentContinueLearningDashboard(userId: string) {
  const { findStudentContinueLearningDashboard, findStudentProfileIdByUserId } = await import("@/repositories/student-learning.repository");
  const profile = await findStudentProfileIdByUserId(userId);
  if (!profile) return null;
  const rows = await findStudentContinueLearningDashboard(profile.id, 6);
  return rows.map((row) => mapStudentLearningResource(row.resource, row));
}

export type StudentLearningItem = ReturnType<typeof mapStudentLearningResource>;
