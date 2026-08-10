import "server-only";

import { planResourceImport } from "./resource-import-planner";
import { validateResourceImportRow } from "./resource-import-validation";
import type { ParsedResourceImportRow } from "./resource-import-csv";

type Repository = {
  findInputs: typeof import("@/repositories/admin-resource-import.repository").findResourceImportPreviewInputs;
  findCollisions: typeof import("@/repositories/admin-resource-import.repository").findResourceImportSlugCollisions;
};

export type ResourceImportPreviewOutcome = "VALID_CHANGE" | "NO_OP" | "INVALID" | "CONFLICT";
export type ResourceImportPreviewRow = {
  rowNumber: number; resourceId: string; currentTitle: string | null; proposedTitle: string;
  currentVersion: number | null; expectedVersion: number | null; currentStatus: string | null;
  resultingStatus: string | null; changedFields: string[]; validationErrors: string[]; referenceErrors: string[];
  mappingChangeWarning: string | null; slugCollisionWarning: string | null; publicVisibilityRemoval: boolean;
  outcome: ResourceImportPreviewOutcome; safeToApply: boolean;
};

export async function previewResourceImport(parsedRows: ParsedResourceImportRow[], repository?: Repository) {
  const rows = parsedRows.map(validateResourceImportRow);
  const repo = repository ?? {
    findInputs: (await import("@/repositories/admin-resource-import.repository")).findResourceImportPreviewInputs,
    findCollisions: (await import("@/repositories/admin-resource-import.repository")).findResourceImportSlugCollisions,
  };
  const unique = (values: Array<string | null>) => [...new Set(values.filter((value): value is string => Boolean(value)))];
  const inputs = await repo.findInputs(unique(rows.map((row) => row.resourceId)), unique(rows.map((row) => row.resourceTypeId)), unique(rows.map((row) => row.chapterId)), unique(rows.map((row) => row.examTopicId)));
  const resources = new Map(inputs.resources.map((resource) => [resource.id, resource]));
  const candidates = rows.flatMap((row) => {
    const current = resources.get(row.resourceId);
    const mappingChanged = current && (current.chapterId !== row.chapterId || current.examTopicId !== row.examTopicId);
    return mappingChanged && row.validationErrors.length === 0 ? [{ resourceId: row.resourceId, slug: current.slug, chapterId: row.chapterId, examTopicId: row.examTopicId }] : [];
  });
  const result=planResourceImport(rows,inputs,await repo.findCollisions(candidates)); return {summary:result.summary,rows:result.rows as ResourceImportPreviewRow[]};
}
