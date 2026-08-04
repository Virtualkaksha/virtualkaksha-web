import "server-only";

import type { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { canAdminEditResourceMapping, canAdminEditResourceMetadata, statusAfterAdminMetadataEdit } from "@/lib/admin/resource-metadata-policy";
import type { ValidatedAdminResourceMetadata } from "@/lib/admin/resource-metadata-validation";

const editSelect = {
  id: true, title: true, titleHindi: true, description: true, resourceTypeId: true, chapterId: true,
  examTopicId: true, language: true, access: true, status: true, version: true, slug: true, format: true,
  pageCount: true, fileSizeBytes: true, publishedAt: true, contentUrl: true, externalUrl: true,
  assets: { where: { isPrimary: true }, orderBy: [{ updatedAt: "desc" as const }, { id: "asc" as const }], take: 1, select: { status: true } },
  _count: { select: { bookmarks: true, progress: true } },
  chapter: { select: { slug: true, boardClassSubject: { select: { board: { select: { slug: true } }, classLevel: { select: { slug: true } }, subject: { select: { slug: true } } } } } },
  examTopic: { select: { slug: true, examSubject: { select: { exam: { select: { slug: true } }, subject: { select: { slug: true } } } } } },
} satisfies Prisma.ResourceSelect;

export async function findAdminResourceMetadata(resourceId: string) {
  const record = await prisma.resource.findUnique({ where: { id: resourceId }, select: editSelect });
  if (!record) return null;
  const { contentUrl, externalUrl, ...safeRecord } = record;
  const primaryAsset = record.assets[0] ?? null;
  const legacySource = record.format === "PDF" && !primaryAsset && Boolean(contentUrl) && !externalUrl;
  return {
    ...safeRecord,
    legacySource,
    assetSource: primaryAsset ? "NATIVE" as const : legacySource ? "LEGACY_CONTENT_URL" as const : externalUrl ? "EXTERNAL" as const : "NONE" as const,
  };
}

export async function findAdminResourceMetadataOptions() {
  const [resourceTypes, chapters, examTopics] = await prisma.$transaction([
    prisma.resourceType.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.chapter.findMany({ where: { isActive: true, boardClassSubject: { isActive: true, board: { isActive: true }, classLevel: { isActive: true }, subject: { isActive: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, boardClassSubject: { select: { board: { select: { shortName: true } }, classLevel: { select: { name: true } }, subject: { select: { name: true } } } } } }),
    prisma.examTopic.findMany({ where: { isActive: true, examSubject: { isActive: true, exam: { isActive: true }, subject: { isActive: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, examSubject: { select: { exam: { select: { shortName: true } }, subject: { select: { name: true } } } } } }),
  ]);
  return { resourceTypes, chapters, examTopics };
}

function pathOf(record: { slug: string; chapter: null | { slug: string; boardClassSubject: { board: { slug: string }; classLevel: { slug: string }; subject: { slug: string } } }; examTopic: null | { slug: string; examSubject: { exam: { slug: string }; subject: { slug: string } } } }) {
  if (record.chapter) return `/student/resources/${record.chapter.boardClassSubject.board.slug}/${record.chapter.boardClassSubject.classLevel.slug}/${record.chapter.boardClassSubject.subject.slug}/${record.chapter.slug}/${record.slug}`;
  if (record.examTopic) return `/student/resources/${record.examTopic.examSubject.exam.slug}/exam/${record.examTopic.examSubject.subject.slug}/${record.examTopic.slug}/${record.slug}`;
  return null;
}

export async function transactAdminResourceMetadataEdit(input: ValidatedAdminResourceMetadata & { actorUserId: string }) {
  try {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.resource.findUnique({ where: { id: input.resourceId }, select: editSelect });
      if (!current) return { outcome: "NOT_FOUND" as const };
      if (!canAdminEditResourceMetadata(current.status)) return { outcome: "READ_ONLY" as const };
      if (current.version !== input.expectedVersion) return { outcome: "CONFLICT" as const };

      const [resourceType, chapter, examTopic] = await Promise.all([
        tx.resourceType.findFirst({ where: { id: input.resourceTypeId, isActive: true }, select: { id: true } }),
        input.chapterId ? tx.chapter.findFirst({ where: { id: input.chapterId, isActive: true, boardClassSubject: { isActive: true, board: { isActive: true }, classLevel: { isActive: true }, subject: { isActive: true } } }, select: { id: true } }) : null,
        input.examTopicId ? tx.examTopic.findFirst({ where: { id: input.examTopicId, isActive: true, examSubject: { isActive: true, exam: { isActive: true }, subject: { isActive: true } } }, select: { id: true } }) : null,
      ]);
      if (!resourceType || Boolean(chapter) === Boolean(examTopic)) return { outcome: "INVALID_REFERENCE" as const };
      const mappingChanged = current.chapterId !== input.chapterId || current.examTopicId !== input.examTopicId;
      if (mappingChanged && !canAdminEditResourceMapping(current.status)) return { outcome: "MAPPING_LOCKED" as const };
      if (mappingChanged) {
        const collision = await tx.resource.findFirst({ where: { id: { not: current.id }, slug: current.slug, OR: [...(input.chapterId ? [{ chapterId: input.chapterId }] : []), ...(input.examTopicId ? [{ examTopicId: input.examTopicId }] : [])] }, select: { id: true } });
        if (collision) return { outcome: "SLUG_CONFLICT" as const };
      }

      const metadataBefore = { title: current.title, titleHindi: current.titleHindi, description: current.description, chapterId: current.chapterId, examTopicId: current.examTopicId, resourceTypeId: current.resourceTypeId, language: current.language, access: current.access };
      const metadataAfter = { title: input.title, titleHindi: input.titleHindi, description: input.description, chapterId: input.chapterId, examTopicId: input.examTopicId, resourceTypeId: input.resourceTypeId, language: input.language, access: input.access };
      const metadataFields = Object.keys(metadataBefore) as Array<keyof typeof metadataBefore>;
      const changedFields: string[] = metadataFields.filter((field) => metadataBefore[field] !== metadataAfter[field]);
      if (!changedFields.length) return { outcome: "NO_CHANGE" as const, version: current.version };

      const nextStatus = statusAfterAdminMetadataEdit(current.status);
      const nextPublishedAt = current.status === "PUBLISHED" ? null : current.publishedAt;
      if (nextStatus !== current.status) changedFields.push("status", "publishedAt");
      const beforeValues = { ...metadataBefore, status: current.status, publishedAt: current.publishedAt?.toISOString() ?? null };
      const afterValues = { ...metadataAfter, status: nextStatus, publishedAt: nextPublishedAt?.toISOString() ?? null };
      const update = await tx.resource.updateMany({
        where: { id: current.id, version: input.expectedVersion, status: current.status },
        data: { ...metadataAfter, status: nextStatus, publishedAt: nextPublishedAt, version: { increment: 1 } },
      });
      if (update.count !== 1) return { outcome: "CONFLICT" as const };
      await tx.resourceMetadataAudit.create({ data: { resourceId: current.id, actorUserId: input.actorUserId, action: "ADMIN_METADATA_EDIT", previousVersion: current.version, newVersion: current.version + 1, changedFields: changedFields.map(String), beforeValues, afterValues, reason: input.reason } });
      const updatedPath = await tx.resource.findUnique({ where: { id: current.id }, select: { slug: true, chapter: editSelect.chapter, examTopic: editSelect.examTopic } });
      return { outcome: "UPDATED" as const, version: current.version + 1, previousPath: pathOf(current), currentPath: updatedPath ? pathOf(updatedPath) : null };
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return { outcome: "SLUG_CONFLICT" as const };
    throw error;
  }
}
