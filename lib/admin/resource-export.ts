import "server-only";

import type { getResourceInventoryExportRows } from "./resource-inventory";

export const RESOURCE_EXPORT_HEADERS = [
  "resource_id", "title", "title_hindi", "description", "board", "class", "subject",
  "chapter_or_topic", "resource_type", "format", "language", "access_level", "status",
  "version", "updated_at", "asset_source", "asset_state", "checksum_present", "page_count",
  "file_size_bytes", "bookmark_count", "progress_count", "missing_description", "duplicate_title",
  "duplicate_checksum", "legacy_source",
] as const;

export const RESOURCE_IMPORT_TEMPLATE_HEADERS = [
  "resource_id", "expected_version", "title", "title_hindi", "description", "resource_type_id",
  "language", "access_level", "chapter_id", "exam_topic_id", "reason", "current_status", "board",
  "class", "subject", "chapter_or_topic", "resource_type", "current_updated_at", "current_slug",
  "asset_source", "asset_state",
] as const;

type InventoryRow = Awaited<ReturnType<typeof getResourceInventoryExportRows>>[number];

export function protectSpreadsheetValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

export function csvCell(value: unknown) {
  return `"${protectSpreadsheetValue(value).replaceAll('"', '""')}"`;
}

export function buildResourceInventoryCsv(rows: InventoryRow[]) {
  const body = rows.map((row) => [
    row.id, row.title, row.titleHindi, row.description, row.board, row.level, row.subject, row.unit,
    row.resourceType, row.format, row.language, row.access, row.status, row.version, row.updatedAt,
    row.assetSource, row.assetState, row.checksumPresent, row.pageCount, row.fileSizeBytes,
    row.bookmarkCount, row.progressCount, row.missingDescription, row.duplicateTitle,
    row.duplicateChecksum, row.legacySource,
  ].map(csvCell).join(","));
  return `\uFEFF${RESOURCE_EXPORT_HEADERS.map(csvCell).join(",")}\r\n${body.join("\r\n")}${body.length ? "\r\n" : ""}`;
}

export function buildResourceImportTemplateCsv(rows: InventoryRow[]) {
  const body = rows.map((row) => [
    row.id, row.version, row.title, row.titleHindi, row.description, row.resourceTypeId,
    row.language, row.access, row.chapterId, row.examTopicId, "", row.status, row.board,
    row.level, row.subject, row.unit, row.resourceType, row.updatedAt, row.slug,
    row.assetSource, row.assetState,
  ].map(csvCell).join(","));
  return `\uFEFF${RESOURCE_IMPORT_TEMPLATE_HEADERS.map(csvCell).join(",")}\r\n${body.join("\r\n")}${body.length ? "\r\n" : ""}`;
}
