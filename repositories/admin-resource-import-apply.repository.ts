/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import { planResourceImport } from "@/lib/admin/resource-import-planner";
import type { ValidatedResourceImportRow } from "@/lib/admin/resource-import-validation";
import prisma from "@/lib/prisma";

class BatchAbort extends Error {
  constructor(public code: "INVALID_BATCH" | "CONFLICT" | "BATCH_ROLLED_BACK") {
    super(code);
  }
}

export function createResourceImportApplyTransaction(prismaClient: any) {
  return async function transactResourceImportApply(rows: ValidatedResourceImportRow[], actorUserId: string) {
    try {
      return await prismaClient.$transaction(async (tx: any) => {
        const ids = [...new Set(rows.map((row) => row.resourceId))].sort();
        const typeIds = [...new Set(rows.map((row) => row.resourceTypeId))];
        const chapterIds = rows.flatMap((row) => row.chapterId ? [row.chapterId] : []);
        const topicIds = rows.flatMap((row) => row.examTopicId ? [row.examTopicId] : []);
        const resources = await tx.resource.findMany({
          where: { id: { in: ids } },
          orderBy: { id: "asc" },
          select: { id: true, title: true, titleHindi: true, description: true, resourceTypeId: true, language: true, access: true, chapterId: true, examTopicId: true, status: true, version: true, slug: true, publishedAt: true },
        });
        for (const resource of resources) {
          if (resource.chapterId) chapterIds.push(resource.chapterId);
          if (resource.examTopicId) topicIds.push(resource.examTopicId);
        }
        const [resourceTypes, chapters, examTopics] = await Promise.all([
          tx.resourceType.findMany({ where: { id: { in: typeIds }, isActive: true }, select: { id: true } }),
          tx.chapter.findMany({ where: { id: { in: [...new Set(chapterIds)] }, isActive: true, boardClassSubject: { isActive: true, board: { isActive: true }, classLevel: { isActive: true }, subject: { isActive: true } } }, select: { id: true, slug: true, boardClassSubject: { select: { board: { select: { slug: true } }, classLevel: { select: { slug: true } }, subject: { select: { slug: true } } } } } }),
          tx.examTopic.findMany({ where: { id: { in: [...new Set(topicIds)] }, isActive: true, examSubject: { isActive: true, exam: { isActive: true }, subject: { isActive: true } } }, select: { id: true, slug: true, examSubject: { select: { exam: { select: { slug: true } }, subject: { select: { slug: true } } } } } }),
        ]);
        const candidates = rows.flatMap((row) => {
          const current = resources.find((resource: any) => resource.id === row.resourceId);
          return current && (current.chapterId !== row.chapterId || current.examTopicId !== row.examTopicId)
            ? [{ resourceId: row.resourceId, slug: current.slug, chapterId: row.chapterId, examTopicId: row.examTopicId }]
            : [];
        });
        const collisions = candidates.length ? await tx.resource.findMany({
          where: { OR: candidates.map((candidate) => ({ id: { not: candidate.resourceId }, slug: candidate.slug, ...(candidate.chapterId ? { chapterId: candidate.chapterId } : { examTopicId: candidate.examTopicId }) })) },
          select: { id: true, slug: true, chapterId: true, examTopicId: true },
        }) : [];

        // Planning is deliberately complete before the first write.
        const plan = planResourceImport(rows, { resources, resourceTypes, chapters, examTopics }, collisions);
        if (plan.summary.invalidRows) throw new BatchAbort("INVALID_BATCH");
        if (plan.summary.conflicts) throw new BatchAbort("CONFLICT");
        if (!plan.summary.validChanges) throw new BatchAbort("INVALID_BATCH");
        const changed = plan.planned
          .filter((item) => item.outcome === "VALID_CHANGE")
          .sort((left, right) => left.resourceId.localeCompare(right.resourceId));
        const results = [];
        for (const item of changed) {
          const metadataPlan = item.metadataPlan!;
          const update = await tx.resource.updateMany({
            where: { id: item.resourceId, version: item.row.expectedVersion, status: item.current.status },
            data: { ...metadataPlan.metadataAfter, status: metadataPlan.resultingStatus, publishedAt: metadataPlan.resultingPublishedAt, version: { increment: 1 } },
          });
          if (update.count !== 1) throw new BatchAbort("CONFLICT");
          await tx.resourceMetadataAudit.create({ data: { resourceId: item.resourceId, actorUserId, action: "ADMIN_METADATA_EDIT", previousVersion: item.current.version, newVersion: item.current.version + 1, changedFields: metadataPlan.changedFields, beforeValues: metadataPlan.beforeValues, afterValues: metadataPlan.afterValues, reason: item.row.reason } });
          results.push({ rowNumber: item.rowNumber, resourceId: item.resourceId, priorVersion: item.current.version, newVersion: item.current.version + 1, priorStatus: item.current.status, resultingStatus: metadataPlan.resultingStatus, changedFields: metadataPlan.changedFields, publicVisibilityRemoval: metadataPlan.publicVisibilityRemoval, previousAcademicPaths: metadataPlan.previousAcademicPaths, resultingAcademicPaths: metadataPlan.resultingAcademicPaths });
        }
        return { totalRows: rows.length, changedRows: changed.length, noOpRows: plan.summary.noOpRows, rows: results };
      }, { isolationLevel: "Serializable", maxWait: 5000, timeout: 15000 });
    } catch (error) {
      if (error instanceof BatchAbort) return { error: error.code } as const;
      if (error && typeof error === "object" && "code" in error && error.code === "P2034") return { error: "CONFLICT" as const };
      return { error: "BATCH_ROLLED_BACK" as const };
    }
  };
}

export const transactResourceImportApply = createResourceImportApplyTransaction(prisma);
