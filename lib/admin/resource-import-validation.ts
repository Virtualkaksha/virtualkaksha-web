import type { ParsedResourceImportRow } from "./resource-import-csv";

export type ValidatedResourceImportRow = {
  rowNumber: number; resourceId: string; expectedVersion: number; title: string; titleHindi: string | null;
  description: string | null; resourceTypeId: string; language: "ENGLISH" | "HINDI";
  access: "FREE" | "PREMIUM" | "ENROLLED_ONLY"; chapterId: string | null; examTopicId: string | null;
  reason: string; validationErrors: string[];
};

function single(value: string, maximum: number) { return value.normalize("NFKC").trim().replace(/\s+/gu, " ").slice(0, maximum + 1); }
function identifier(value: string) { const result = single(value, 128); return /^[A-Za-z0-9_-]{1,128}$/.test(result) ? result : null; }

export function validateResourceImportRow(row: ParsedResourceImportRow): ValidatedResourceImportRow {
  const errors: string[] = [];
  for (const name of ["current_status", "board", "class", "subject", "chapter_or_topic", "resource_type", "current_updated_at", "current_slug", "asset_source", "asset_state"] as const) {
    if (row.values[name].normalize("NFKC").length > 500) errors.push(`${name} exceeds 500 characters.`);
  }
  const resourceId = identifier(row.values.resource_id); if (!resourceId) errors.push("resource_id is invalid.");
  const versionText = single(row.values.expected_version, 20);
  const expectedVersion = /^\d+$/.test(versionText) ? Number(versionText) : Number.NaN;
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) errors.push("expected_version must be a positive integer.");
  const title = single(row.values.title, 200); if (title.length < 3 || title.length > 200) errors.push("title must contain 3 to 200 characters.");
  const titleHindiText = single(row.values.title_hindi, 200); if (titleHindiText.length > 200) errors.push("title_hindi exceeds 200 characters.");
  const descriptionText = row.values.description.normalize("NFKC").replace(/\r\n?/g, "\n").trim(); if (descriptionText.length > 4_000) errors.push("description exceeds 4000 characters.");
  const resourceTypeId = identifier(row.values.resource_type_id); if (!resourceTypeId) errors.push("resource_type_id is invalid.");
  const chapterId = row.values.chapter_id.trim() ? identifier(row.values.chapter_id) : null;
  const examTopicId = row.values.exam_topic_id.trim() ? identifier(row.values.exam_topic_id) : null;
  if (row.values.chapter_id.trim() && !chapterId) errors.push("chapter_id is invalid.");
  if (row.values.exam_topic_id.trim() && !examTopicId) errors.push("exam_topic_id is invalid.");
  if (Boolean(chapterId) === Boolean(examTopicId)) errors.push("Exactly one academic mapping is required.");
  const language = single(row.values.language, 20); if (language !== "ENGLISH" && language !== "HINDI") errors.push("language is invalid.");
  const access = single(row.values.access_level, 30); if (!(["FREE", "PREMIUM", "ENROLLED_ONLY"] as const).includes(access as never)) errors.push("access_level is invalid.");
  const reason = single(row.values.reason, 1_000); if (reason.length < 10 || reason.length > 1_000) errors.push("reason must contain 10 to 1000 characters.");
  return { rowNumber: row.rowNumber, resourceId: resourceId ?? "", expectedVersion, title, titleHindi: titleHindiText || null,
    description: descriptionText || null, resourceTypeId: resourceTypeId ?? "", language: language as "ENGLISH" | "HINDI",
    access: access as "FREE" | "PREMIUM" | "ENROLLED_ONLY", chapterId, examTopicId, reason, validationErrors: errors };
}
