import "server-only";

import prisma from "@/lib/prisma";

export async function findResourceImportPreviewInputs(resourceIds: string[], resourceTypeIds: string[], chapterIds: string[], examTopicIds: string[]) {
  const [resources, resourceTypes, chapters, examTopics] = await Promise.all([
    prisma.resource.findMany({ where: { id: { in: resourceIds } }, select: {
      id: true, title: true, titleHindi: true, description: true, resourceTypeId: true, language: true,
      access: true, chapterId: true, examTopicId: true, status: true, version: true, slug: true,
    } }),
    prisma.resourceType.findMany({ where: { id: { in: resourceTypeIds }, isActive: true }, select: { id: true } }),
    prisma.chapter.findMany({ where: { id: { in: chapterIds }, isActive: true, boardClassSubject: { isActive: true, board: { isActive: true }, classLevel: { isActive: true }, subject: { isActive: true } } }, select: { id: true } }),
    prisma.examTopic.findMany({ where: { id: { in: examTopicIds }, isActive: true, examSubject: { isActive: true, exam: { isActive: true }, subject: { isActive: true } } }, select: { id: true } }),
  ]);
  return { resources, resourceTypes, chapters, examTopics };
}

export function findResourceImportSlugCollisions(candidates: Array<{ resourceId: string; slug: string; chapterId: string | null; examTopicId: string | null }>) {
  if (!candidates.length) return Promise.resolve([]);
  return prisma.resource.findMany({
    where: { OR: candidates.map((candidate) => ({
      id: { not: candidate.resourceId }, slug: candidate.slug,
      ...(candidate.chapterId ? { chapterId: candidate.chapterId } : { examTopicId: candidate.examTopicId }),
    })) },
    select: { id: true, slug: true, chapterId: true, examTopicId: true },
  });
}
