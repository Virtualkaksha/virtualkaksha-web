import "server-only";

import { canAdminEditResourceMapping, canAdminEditResourceMetadata, statusAfterAdminMetadataEdit } from "./resource-metadata-policy";
import { validateResourceImportRow, type ValidatedResourceImportRow } from "./resource-import-validation";
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

const fields = ["title", "titleHindi", "description", "resourceTypeId", "language", "access", "chapterId", "examTopicId"] as const;

export async function previewResourceImport(parsedRows: ParsedResourceImportRow[], repository?: Repository) {
  const rows = parsedRows.map(validateResourceImportRow);
  const repo = repository ?? {
    findInputs: (await import("@/repositories/admin-resource-import.repository")).findResourceImportPreviewInputs,
    findCollisions: (await import("@/repositories/admin-resource-import.repository")).findResourceImportSlugCollisions,
  };
  const unique = (values: Array<string | null>) => [...new Set(values.filter((value): value is string => Boolean(value)))];
  const inputs = await repo.findInputs(unique(rows.map((row) => row.resourceId)), unique(rows.map((row) => row.resourceTypeId)), unique(rows.map((row) => row.chapterId)), unique(rows.map((row) => row.examTopicId)));
  const resources = new Map(inputs.resources.map((resource) => [resource.id, resource]));
  const activeTypes = new Set(inputs.resourceTypes.map(({ id }) => id));
  const activeChapters = new Set(inputs.chapters.map(({ id }) => id));
  const activeTopics = new Set(inputs.examTopics.map(({ id }) => id));
  const candidates = rows.flatMap((row) => {
    const current = resources.get(row.resourceId);
    const mappingChanged = current && (current.chapterId !== row.chapterId || current.examTopicId !== row.examTopicId);
    return mappingChanged && row.validationErrors.length === 0 ? [{ resourceId: row.resourceId, slug: current.slug, chapterId: row.chapterId, examTopicId: row.examTopicId }] : [];
  });
  const collisions = await repo.findCollisions(candidates);
  const collisionKeys = new Set(collisions.map((item) => `${item.slug}:${item.chapterId ?? ""}:${item.examTopicId ?? ""}`));

  const previewRows: ResourceImportPreviewRow[] = rows.map((row) => previewRow(row, resources.get(row.resourceId), activeTypes, activeChapters, activeTopics, collisionKeys));
  const summary = {
    totalRows: previewRows.length,
    validChanges: previewRows.filter(({ outcome }) => outcome === "VALID_CHANGE").length,
    noOpRows: previewRows.filter(({ outcome }) => outcome === "NO_OP").length,
    invalidRows: previewRows.filter(({ outcome }) => outcome === "INVALID").length,
    conflicts: previewRows.filter(({ outcome }) => outcome === "CONFLICT").length,
  };
  return { summary, rows: previewRows };
}

function previewRow(row: ValidatedResourceImportRow, current: Awaited<ReturnType<Repository["findInputs"]>>["resources"][number] | undefined, activeTypes: Set<string>, activeChapters: Set<string>, activeTopics: Set<string>, collisionKeys: Set<string>): ResourceImportPreviewRow {
  const validationErrors = [...row.validationErrors];
  const referenceErrors: string[] = [];
  if (!current) referenceErrors.push("The resource does not exist.");
  if (row.resourceTypeId && !activeTypes.has(row.resourceTypeId)) referenceErrors.push("The resource type is inactive or unavailable.");
  if (row.chapterId && !activeChapters.has(row.chapterId)) referenceErrors.push("The chapter hierarchy is inactive or unavailable.");
  if (row.examTopicId && !activeTopics.has(row.examTopicId)) referenceErrors.push("The exam-topic hierarchy is inactive or unavailable.");
  if (current && !canAdminEditResourceMetadata(current.status)) validationErrors.push("Archived resources are read-only.");
  const mappingChanged = Boolean(current && (current.chapterId !== row.chapterId || current.examTopicId !== row.examTopicId));
  const mappingChangeWarning = current?.status === "PUBLISHED" && mappingChanged ? "Published resource mapping cannot be changed." : null;
  if (mappingChangeWarning || (current && mappingChanged && !canAdminEditResourceMapping(current.status))) validationErrors.push("The academic mapping is locked for this resource status.");
  const slugCollisionWarning = current && mappingChanged && collisionKeys.has(`${current.slug}:${row.chapterId ?? ""}:${row.examTopicId ?? ""}`)
    ? "The proposed mapping already contains this resource slug." : null;
  if (slugCollisionWarning) validationErrors.push("The proposed academic mapping has a slug collision.");
  const proposed = { title: row.title, titleHindi: row.titleHindi, description: row.description, resourceTypeId: row.resourceTypeId, language: row.language, access: row.access, chapterId: row.chapterId, examTopicId: row.examTopicId };
  const changedFields = current ? fields.filter((field) => current[field] !== proposed[field]) : [];
  const conflict = Boolean(current && current.version !== row.expectedVersion);
  const invalid = validationErrors.length > 0 || referenceErrors.length > 0;
  const outcome: ResourceImportPreviewOutcome = invalid ? "INVALID" : conflict ? "CONFLICT" : changedFields.length ? "VALID_CHANGE" : "NO_OP";
  const resultingStatus = current ? (outcome === "VALID_CHANGE" ? statusAfterAdminMetadataEdit(current.status) : current.status) : null;
  const publicVisibilityRemoval = current?.status === "PUBLISHED" && resultingStatus === "PENDING_REVIEW";
  return { rowNumber: row.rowNumber, resourceId: row.resourceId, currentTitle: current?.title ?? null, proposedTitle: row.title,
    currentVersion: current?.version ?? null, expectedVersion: Number.isSafeInteger(row.expectedVersion) ? row.expectedVersion : null,
    currentStatus: current?.status ?? null, resultingStatus, changedFields, validationErrors, referenceErrors,
    mappingChangeWarning, slugCollisionWarning, publicVisibilityRemoval, outcome, safeToApply: outcome === "VALID_CHANGE" || outcome === "NO_OP" };
}
