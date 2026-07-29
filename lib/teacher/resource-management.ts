import type { PublicationStatus, ResourceAssetStatus } from "@/app/generated/prisma/enums";
import { buildSearchPagination, type TeacherResourceSearchQuery } from "@/lib/resources/resource-search-query";
import {
  canTeacherEditResource,
  getTeacherResourceActions,
  getTeacherTransitionPolicy,
  type TeacherResourceTransition,
} from "@/lib/teacher/resource-management-policy";

type TeacherIdentity = { id: string; roles: string[] };
type TransitionResult = { count: number };
type TransitionRepository = (input: {
  resourceId: string;
  userId: string;
  allowedStatuses: PublicationStatus[];
  data: Record<string, unknown>;
}) => Promise<TransitionResult>;

export type TeacherResourceTransitionResult =
  | { ok: true; message: string }
  | { ok: false; code: "UNAUTHENTICATED" | "FORBIDDEN" | "INVALID_RESOURCE" | "NOT_FOUND_OR_INVALID_STATE"; message: string };

function academicLabel(record: {
  chapter: null | { name: string; boardClassSubject: { board: { shortName: string }; classLevel: { name: string }; subject: { name: string } } };
  examTopic: null | { name: string; examSubject: { exam: { shortName: string }; subject: { name: string } } };
}) {
  if (record.chapter) {
    const path = record.chapter.boardClassSubject;
    return `${path.board.shortName} · ${path.classLevel.name} · ${path.subject.name} · ${record.chapter.name}`;
  }
  if (record.examTopic) {
    return `${record.examTopic.examSubject.exam.shortName} · ${record.examTopic.examSubject.subject.name} · ${record.examTopic.name}`;
  }
  return "Unmapped resource";
}

export function resolveNativePdfAssetState(
  format: string,
  assets: Array<{ status: ResourceAssetStatus }>,
  externalUrl?: string | null,
) {
  if (format !== "PDF") return null;
  if (assets.length === 0 && externalUrl) return null;
  return assets[0]?.status ?? "MISSING";
}

export async function getTeacherManagedResources(userId: string, query: TeacherResourceSearchQuery) {
  const { findTeacherManagedResourcePage } = await import("@/repositories/teacher-resource.repository");
  const result = await findTeacherManagedResourcePage(userId, query);
  return {
    items: result.rows.map((record) => ({
      ...record,
      academicLabel: academicLabel(record),
      assetState: resolveNativePdfAssetState(record.format, record.assets, record.externalUrl),
      actions: getTeacherResourceActions(record.status),
    })),
    pagination: buildSearchPagination(result.total, result.page, query.pageSize),
  };
}

export async function getTeacherManagedResource(user: TeacherIdentity, resourceId: string) {
  if (!user.id || (!user.roles.includes("TEACHER") && !user.roles.includes("ADMIN"))) return null;
  const { findTeacherManagedResource } = await import("@/repositories/teacher-resource.repository");
  const record = await findTeacherManagedResource(resourceId, user.id, user.roles.includes("ADMIN"));
  if (!record) return null;
  return {
    ...record,
    academicLabel: academicLabel(record),
    assetState: resolveNativePdfAssetState(record.format, record.assets, record.externalUrl),
    actions: getTeacherResourceActions(record.status),
  };
}

export function validExternalHttpUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

type MetadataUpdateRepository = (input: {
  resourceId: string;
  userId: string;
  resourceTypeId: string;
  chapterId: string | null;
  examTopicId: string | null;
  data: Record<string, unknown>;
}) => Promise<{ count: number; reason: "INVALID_REFERENCE" | "NOT_FOUND_OR_INVALID_STATE" | "SLUG_CONFLICT" | null }>;

function formText(formData: FormData, name: string, required = false) {
  const value = formData.get(name);
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new Error(`${name} is required.`);
  return result || null;
}

function nonNegativeInteger(formData: FormData, name: string) {
  const value = formText(formData, name);
  if (!value) return null;
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be zero or greater.`);
  return Number(value);
}

export async function updateTeacherResourceMetadata(
  input: { user: TeacherIdentity; resourceId: string; format: string; currentStatus: PublicationStatus; formData: FormData },
  repository?: MetadataUpdateRepository,
) {
  if (!input.user.id) return { ok: false as const, code: "UNAUTHENTICATED", message: "Please sign in." };
  if (!input.user.roles.includes("TEACHER") && !input.user.roles.includes("ADMIN")) return { ok: false as const, code: "FORBIDDEN", message: "Teacher access is required." };
  if (!canTeacherEditResource(input.currentStatus)) return { ok: false as const, code: "INVALID_STATE", message: "This resource cannot be edited in its current state." };

  try {
    const title = formText(input.formData, "title", true)!;
    const resourceTypeId = formText(input.formData, "resourceTypeId", true)!;
    const mapping = formText(input.formData, "mapping", true)!;
    const separator = mapping.indexOf(":");
    const mappingType = separator > 0 ? mapping.slice(0, separator) : null;
    const mappingId = separator > 0 ? mapping.slice(separator + 1) : "";
    const language = formText(input.formData, "language", true);
    const access = formText(input.formData, "access", true);
    if (!['ENGLISH', 'HINDI'].includes(language!)) throw new Error("Invalid language.");
    if (!['FREE', 'PREMIUM', 'ENROLLED_ONLY'].includes(access!)) throw new Error("Invalid access type.");
    if ((mappingType !== "CHAPTER" && mappingType !== "EXAM_TOPIC") || !mappingId) throw new Error("Invalid academic mapping.");
    const thumbnailUrl = formText(input.formData, "thumbnailUrl");
    if (thumbnailUrl && !validExternalHttpUrl(thumbnailUrl)) throw new Error("Thumbnail URL must use http or https.");
    const pageCount = input.format === "PDF" ? nonNegativeInteger(input.formData, "pageCount") : null;
    const durationMinutes = input.format === "VIDEO" ? nonNegativeInteger(input.formData, "durationMinutes") : null;

    const update = repository ?? (await import("@/repositories/teacher-resource.repository")).updateTeacherManagedResourceMetadata as unknown as MetadataUpdateRepository;
    const result = await update({
      resourceId: input.resourceId,
      userId: input.user.id,
      resourceTypeId,
      chapterId: mappingType === "CHAPTER" ? mappingId : null,
      examTopicId: mappingType === "EXAM_TOPIC" ? mappingId : null,
      data: {
        title,
        titleHindi: formText(input.formData, "titleHindi"),
        description: formText(input.formData, "description"),
        language,
        access,
        thumbnailUrl,
        pageCount,
        durationSeconds: durationMinutes === null ? null : durationMinutes * 60,
      },
    });
    if (result.count !== 1) return { ok: false as const, code: result.reason ?? "NOT_FOUND_OR_INVALID_STATE", message: "The resource or selected catalogue entry is unavailable." };
    return { ok: true as const, message: "Resource metadata saved." };
  } catch (error) {
    return { ok: false as const, code: "INVALID_INPUT", message: error instanceof Error ? error.message : "Invalid resource metadata." };
  }
}

export async function transitionTeacherResource(
  input: { user: TeacherIdentity; resourceId: string; transition: TeacherResourceTransition },
  repository?: TransitionRepository,
): Promise<TeacherResourceTransitionResult> {
  if (!input.user.id) {
    return { ok: false, code: "UNAUTHENTICATED", message: "You need to sign in to manage resources." };
  }
  if (!input.user.roles.includes("TEACHER") && !input.user.roles.includes("ADMIN")) {
    return { ok: false, code: "FORBIDDEN", message: "Only teachers and admins can manage teacher resources." };
  }
  if (!input.resourceId.trim()) {
    return { ok: false, code: "INVALID_RESOURCE", message: "Resource ID is required." };
  }

  const policy = getTeacherTransitionPolicy(input.transition);
  const update = repository ?? (await import("@/repositories/teacher-resource.repository")).updateTeacherManagedResourceStatus as unknown as TransitionRepository;
  const result = await update({
    resourceId: input.resourceId,
    userId: input.user.id,
    allowedStatuses: policy.allowedStatuses,
    data: policy.data,
  });

  if (result.count !== 1) {
    return {
      ok: false,
      code: "NOT_FOUND_OR_INVALID_STATE",
      message: "The resource was not found or is no longer in a state that allows this action.",
    };
  }

  return { ok: true, message: "Resource status updated successfully." };
}
