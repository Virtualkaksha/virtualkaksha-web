import "server-only";

import type { Prisma } from "@/app/generated/prisma/client";
import type { ResourceInventoryRecord } from "@/repositories/resource-inventory.repository";

export const RESOURCE_INVENTORY_PAGE_SIZE = 25;
export const RESOURCE_INVENTORY_MAX_PAGE_SIZE = 100;
export const RESOURCE_INVENTORY_EXPORT_MAX = 5_000;

const STATUSES = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "ARCHIVED"] as const;
const LANGUAGES = ["ENGLISH", "HINDI"] as const;
const ACCESS_LEVELS = ["FREE", "PREMIUM", "ENROLLED_ONLY"] as const;
export const ASSET_HEALTH_VALUES = ["READY", "MISSING", "NON_READY", "LEGACY", "NO_SOURCE"] as const;

type RawParams = Record<string, string | string[] | undefined>;
export type InventoryFilters = {
  status: string;
  board: string;
  level: string;
  subject: string;
  resourceType: string;
  language: string;
  access: string;
  assetHealth: string;
  missingDescription: boolean;
  duplicateTitle: boolean;
  duplicateChecksum: boolean;
  legacySource: boolean;
  page: number;
  pageSize: number;
};

function scalar(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function enumValue(value: string | string[] | undefined, allowed: readonly string[]) {
  const candidate = scalar(value).toUpperCase();
  return allowed.includes(candidate) ? candidate : "";
}
function slug(value: string | string[] | undefined) { const candidate = scalar(value).trim().toLowerCase(); return /^[a-z0-9-]{1,100}$/.test(candidate) ? candidate : ""; }
function flag(value: string | string[] | undefined) { return scalar(value).toLowerCase() === "true"; }
function positive(value: string | string[] | undefined, fallback: number, maximum: number) { const candidate = Number(scalar(value)); return Number.isSafeInteger(candidate) && candidate > 0 ? Math.min(candidate, maximum) : fallback; }

export function parseResourceInventoryFilters(params: RawParams): InventoryFilters {
  return {
    status: enumValue(params.status, STATUSES),
    board: slug(params.board),
    level: slug(params.level),
    subject: slug(params.subject),
    resourceType: slug(params.resourceType),
    language: enumValue(params.language, LANGUAGES),
    access: enumValue(params.access, ACCESS_LEVELS),
    assetHealth: enumValue(params.assetHealth, ASSET_HEALTH_VALUES),
    missingDescription: flag(params.missingDescription),
    duplicateTitle: flag(params.duplicateTitle),
    duplicateChecksum: flag(params.duplicateChecksum),
    legacySource: flag(params.legacySource),
    page: positive(params.page, 1, 10_000),
    pageSize: positive(params.pageSize, RESOURCE_INVENTORY_PAGE_SIZE, RESOURCE_INVENTORY_MAX_PAGE_SIZE),
  };
}

export function findDuplicateResourceIds(inputs: { titles: Array<{ id: string; title: string }>; checksums: Array<{ resourceId: string; checksum: string | null }> }) {
  const titleGroups = new Map<string, string[]>();
  for (const item of inputs.titles) {
    const key = item.title.normalize("NFKC").trim().toLocaleLowerCase();
    if (!key) continue;
    titleGroups.set(key, [...(titleGroups.get(key) ?? []), item.id]);
  }
  const checksumGroups = new Map<string, string[]>();
  for (const item of inputs.checksums) {
    if (!item.checksum) continue;
    checksumGroups.set(item.checksum, [...(checksumGroups.get(item.checksum) ?? []), item.resourceId]);
  }
  return {
    duplicateTitleIds: new Set([...titleGroups.values()].filter((ids) => ids.length > 1).flat()),
    duplicateChecksumIds: new Set([...checksumGroups.values()].filter((ids) => new Set(ids).size > 1).flat()),
    duplicateTitleGroupCount: [...titleGroups.values()].filter((ids) => ids.length > 1).length,
    duplicateChecksumGroupCount: [...checksumGroups.values()].filter((ids) => new Set(ids).size > 1).length,
  };
}

function assetHealthWhere(value: string): Prisma.ResourceWhereInput | null {
  if (value === "READY") return { assets: { some: { isPrimary: true, status: "READY" } } };
  if (value === "NON_READY") return { assets: { some: { isPrimary: true, status: { in: ["UPLOADING", "FAILED", "DELETED"] } } } };
  if (value === "MISSING") return { format: "PDF", contentUrl: null, externalUrl: null, assets: { none: { isPrimary: true } } };
  if (value === "LEGACY") return { format: "PDF", contentUrl: { not: null }, externalUrl: null, assets: { none: { isPrimary: true } } };
  if (value === "NO_SOURCE") return { contentUrl: null, externalUrl: null, textContent: null, assets: { none: { isPrimary: true, status: "READY" } } };
  return null;
}

export function buildResourceInventoryWhere(filters: InventoryFilters, duplicates: ReturnType<typeof findDuplicateResourceIds>): Prisma.ResourceWhereInput {
  const academic = filters.board || filters.level || filters.subject ? {
    OR: [
      { chapter: { is: { boardClassSubject: { is: {
        ...(filters.board ? { board: { is: { slug: filters.board } } } : {}),
        ...(filters.level ? { classLevel: { is: { slug: filters.level } } } : {}),
        ...(filters.subject ? { subject: { is: { slug: filters.subject } } } : {}),
      } } } } },
      ...(!filters.board && !filters.level && filters.subject ? [{ examTopic: { is: { examSubject: { is: { subject: { is: { slug: filters.subject } } } } } } }] : []),
    ],
  } satisfies Prisma.ResourceWhereInput : null;
  const assetHealth = assetHealthWhere(filters.assetHealth);
  return { AND: [
    ...(filters.status ? [{ status: filters.status as never }] : []),
    ...(filters.resourceType ? [{ resourceType: { is: { slug: filters.resourceType } } }] : []),
    ...(filters.language ? [{ language: filters.language as never }] : []),
    ...(filters.access ? [{ access: filters.access as never }] : []),
    ...(filters.missingDescription ? [{ OR: [{ description: null }, { description: "" }] }] : []),
    ...(filters.legacySource ? [{ format: "PDF" as const, contentUrl: { not: null }, externalUrl: null, assets: { none: { isPrimary: true } } }] : []),
    ...(filters.duplicateTitle ? [{ id: { in: [...duplicates.duplicateTitleIds] } }] : []),
    ...(filters.duplicateChecksum ? [{ id: { in: [...duplicates.duplicateChecksumIds] } }] : []),
    ...(academic ? [academic] : []),
    ...(assetHealth ? [assetHealth] : []),
  ] };
}

export type InventoryAssetState = "READY" | "NON_READY" | "MISSING" | "LEGACY" | "NO_SOURCE";

export function mapResourceInventoryRow(record: ResourceInventoryRecord, duplicates: ReturnType<typeof findDuplicateResourceIds>) {
  const asset = record.assets[0] ?? null;
  const legacySource = record.format === "PDF" && !asset && !record.externalUrl && Boolean(record.contentUrl);
  const assetState: InventoryAssetState = asset?.status === "READY" ? "READY"
    : asset ? "NON_READY"
      : legacySource ? "LEGACY"
        : record.format === "PDF" && !record.externalUrl ? "MISSING"
          : record.contentUrl || record.externalUrl || record.textContent ? "MISSING" : "NO_SOURCE";
  const mapping = record.chapter ? {
    board: record.chapter.boardClassSubject.board.shortName,
    level: record.chapter.boardClassSubject.classLevel.name,
    subject: record.chapter.boardClassSubject.subject.name,
    unit: record.chapter.name,
  } : record.examTopic ? {
    board: record.examTopic.examSubject.exam.shortName,
    level: "Exam",
    subject: record.examTopic.examSubject.subject.name,
    unit: record.examTopic.name,
  } : { board: "—", level: "—", subject: "—", unit: "—" };
  const uploader = record.createdBy?.displayName
    ?? ([record.createdBy?.firstName, record.createdBy?.lastName].filter(Boolean).join(" ") || "Unknown uploader");
  return {
    id: record.id, title: record.title, titleHindi: record.titleHindi, description: record.description,
    ...mapping, resourceType: record.resourceType.name, format: record.format, language: record.language,
    access: record.access, status: record.status, version: record.version, uploader,
    assetSource: asset ? "NATIVE" as const
      : legacySource ? "LEGACY_CONTENT_URL" as const
        : record.externalUrl ? "EXTERNAL" as const
          : record.textContent ? "TEXT_CONTENT" as const : "NONE" as const,
    assetState, primaryAssetAvailable: Boolean(asset), checksumPresent: Boolean(asset?.checksum),
    pageCount: record.pageCount, fileSizeBytes: record.fileSizeBytes?.toString() ?? null,
    bookmarkCount: record._count.bookmarks, progressCount: record._count.progress,
    createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
    missingDescription: !record.description?.trim(), duplicateTitle: duplicates.duplicateTitleIds.has(record.id),
    duplicateChecksum: duplicates.duplicateChecksumIds.has(record.id), legacySource,
  };
}

export async function getResourceInventory(filters: InventoryFilters) {
  const repository = await import("@/repositories/resource-inventory.repository");
  const duplicateInputs = await repository.findResourceInventoryDuplicateInputs();
  const duplicates = findDuplicateResourceIds(duplicateInputs);
  const where = buildResourceInventoryWhere(filters, duplicates);
  const [result, facets] = await Promise.all([
    repository.findResourceInventoryPage(where, filters.page, filters.pageSize),
    repository.findResourceInventoryFacets(),
  ]);
  return { ...result, rows: result.rows.map((row) => mapResourceInventoryRow(row, duplicates)), facets, duplicateTitleGroupCount: duplicates.duplicateTitleGroupCount, duplicateChecksumGroupCount: duplicates.duplicateChecksumGroupCount };
}

export async function getResourceInventoryExportRows(filters: InventoryFilters) {
  const repository = await import("@/repositories/resource-inventory.repository");
  const duplicates = findDuplicateResourceIds(await repository.findResourceInventoryDuplicateInputs());
  const rows = await repository.findResourceInventoryExport(buildResourceInventoryWhere(filters, duplicates), RESOURCE_INVENTORY_EXPORT_MAX + 1);
  if (rows.length > RESOURCE_INVENTORY_EXPORT_MAX) throw new Error("Resource export exceeds the safe maximum.");
  return rows.map((row) => mapResourceInventoryRow(row, duplicates));
}
