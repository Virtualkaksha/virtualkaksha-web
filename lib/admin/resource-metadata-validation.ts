const ALLOWED_FIELDS = new Set([
  "resourceId", "expectedVersion", "title", "titleHindi", "description", "resourceTypeId",
  "language", "access", "chapterId", "examTopicId", "reason",
]);

const FRAMEWORK_FIELD = /^\$ACTION_/;

export type ValidatedAdminResourceMetadata = {
  resourceId: string;
  expectedVersion: number;
  title: string;
  titleHindi: string | null;
  description: string | null;
  resourceTypeId: string;
  language: "ENGLISH" | "HINDI";
  access: "FREE" | "PREMIUM" | "ENROLLED_ONLY";
  chapterId: string | null;
  examTopicId: string | null;
  reason: string;
};

function normalizedSingleLine(value: FormDataEntryValue | null, name: string, required: boolean, maximum: number) {
  if (typeof value !== "string") throw new Error(`${name} is invalid.`);
  const normalized = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (required && !normalized) throw new Error(`${name} is required.`);
  if (normalized.length > maximum) throw new Error(`${name} is too long.`);
  return normalized || null;
}
function identifier(value: FormDataEntryValue | null, name: string) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new Error(`${name} is invalid.`);
  return value;
}

export function parseAdminResourceMetadata(formData: FormData): ValidatedAdminResourceMetadata {
  for (const key of new Set(formData.keys())) {
    if (!ALLOWED_FIELDS.has(key) && !FRAMEWORK_FIELD.test(key)) throw new Error("The form contains an unsupported field.");
    if (ALLOWED_FIELDS.has(key) && formData.getAll(key).length !== 1) throw new Error(`${key} must be provided exactly once.`);
  }
  for (const key of ALLOWED_FIELDS) {
    if (!formData.has(key)) throw new Error(`${key} is required.`);
  }

  const versionText = formData.get("expectedVersion");
  const expectedVersion = typeof versionText === "string" && /^\d+$/.test(versionText) ? Number(versionText) : Number.NaN;
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new Error("expectedVersion must be a positive integer.");

  const title = normalizedSingleLine(formData.get("title"), "title", true, 200)!;
  if (title.length < 3) throw new Error("title must contain at least 3 characters.");
  const titleHindi = normalizedSingleLine(formData.get("titleHindi"), "titleHindi", false, 200);
  const descriptionValue = formData.get("description");
  if (typeof descriptionValue !== "string") throw new Error("description is invalid.");
  const description = descriptionValue.normalize("NFKC").replace(/\r\n?/g, "\n").trim() || null;
  if (description && description.length > 4_000) throw new Error("description is too long.");
  const reason = normalizedSingleLine(formData.get("reason"), "reason", true, 1_000)!;
  if (reason.length < 10) throw new Error("reason must contain at least 10 characters.");

  const language = formData.get("language");
  if (language !== "ENGLISH" && language !== "HINDI") throw new Error("language is invalid.");
  const access = formData.get("access");
  if (access !== "FREE" && access !== "PREMIUM" && access !== "ENROLLED_ONLY") throw new Error("access is invalid.");
  const chapterText = formData.get("chapterId");
  const examText = formData.get("examTopicId");
  const chapterId = chapterText === "" ? null : identifier(chapterText, "chapterId");
  const examTopicId = examText === "" ? null : identifier(examText, "examTopicId");
  if (Boolean(chapterId) === Boolean(examTopicId)) throw new Error("Exactly one academic mapping is required.");

  return {
    resourceId: identifier(formData.get("resourceId"), "resourceId"), expectedVersion, title, titleHindi,
    description, resourceTypeId: identifier(formData.get("resourceTypeId"), "resourceTypeId"),
    language, access, chapterId, examTopicId, reason,
  };
}
