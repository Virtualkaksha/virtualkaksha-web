"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ContentLanguage, PublicationStatus, ResourceAccess, ResourceFormat } from "@/app/generated/prisma/client";
import { registerUploadedResourceAsset, uploadResourceAsset, type UploadResourceAssetResult } from "@/lib/resources/upload-service";
import { transitionTeacherResource, updateTeacherResourceMetadata } from "@/lib/teacher/resource-management";
import type { TeacherResourceTransition } from "@/lib/teacher/resource-management-policy";
import { enforceRateLimitChecks, resolveRequestClientIp } from "@/lib/rate-limit";
import { authorizeTeacherMutation } from "@/lib/teacher/mutation-rate-limit";
import { requireAnyCurrentRole } from "@/lib/auth/current-identity";

type TeacherResourcePrismaClient = {
  teacherProfile: {
    findUnique: (args: { where: { userId: string }; select: { id: true } }) => Promise<{ id: string } | null>;
  };
  chapter: {
    findFirst: (args: { where: { id: string; isActive: boolean }; select: { id: true } }) => Promise<{ id: string } | null>;
  };
  resourceType: {
    findFirst: (args: { where: { id: string; isActive: boolean }; select: { id: true } }) => Promise<{ id: string } | null>;
  };
  resource: {
    findFirst: (args: { where: { chapterId: string; slug: string }; select: { id: true } }) => Promise<{ id: string } | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
    updateMany: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<unknown>;
    delete: (args: { where: { id: string } }) => Promise<unknown>;
  };
};

let prisma: TeacherResourcePrismaClient | null = null;

async function getPrismaClient(): Promise<TeacherResourcePrismaClient> {
  if (!prisma) {
    const mod = await import("@/lib/prisma");
    prisma = mod.default as unknown as TeacherResourcePrismaClient;
  }
  return prisma;
}

export type TeacherResourceActionResult =
  | { ok: true; message: string; resourceId: string }
  | { ok: false; code: string; message: string; resourceId?: string; retryable: boolean; retryAfterSeconds?: number };

type TeacherUser = { id: string; roles: string[] };

type CreateTeacherResourceCoreInput = {
  user: TeacherUser;
  formData: FormData;
  prismaClient?: TeacherResourcePrismaClient;
  uploadHandler?: (input: { user: TeacherUser; resourceId: string; file: File }) => Promise<UploadResourceAssetResult>;
  /** Used when the browser uploaded straight to storage and sent only the key. */
  registerHandler?: (input: {
    user: TeacherUser;
    resourceId: string;
    objectKey: string;
    originalFileName: string;
  }) => Promise<UploadResourceAssetResult>;
};

function required(formData: FormData, name: string) { const value = formData.get(name); if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required.`); return value.trim(); }
function optional(formData: FormData, name: string) { const value = formData.get(name); return typeof value === "string" && value.trim() ? value.trim() : null; }
function optionalInt(formData: FormData, name: string) { const value = optional(formData, name); if (!value) return null; const result = Number.parseInt(value, 10); if (!Number.isInteger(result) || result < 0) throw new Error(`${name} must be zero or greater.`); return result; }
function slugify(value: string) { return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function isHttpUrl(value: string | null) { if (!value) return true; try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:"; } catch { return false; } }
async function uniqueSlug(prismaClient: TeacherResourcePrismaClient, chapterId: string, title: string) { const base = slugify(title) || `resource-${Date.now()}`; for (let attempt = 1; attempt < 100; attempt += 1) { const slug = attempt === 1 ? base : `${base}-${attempt}`; const match = await prismaClient.resource.findFirst({ where: { chapterId, slug }, select: { id: true } }); if (!match) return slug; } return `${base}-${Date.now()}`; }
async function revalidateResourcePaths() {
  try {
    revalidatePath("/teacher");
    revalidatePath("/teacher/resources");
    revalidatePath("/student/resources");
    revalidatePath("/admin/resources");
  } catch {
    // noop in non-Next runtime environments such as tests
  }
}

export async function createTeacherResourceCore({
  user,
  formData,
  prismaClient,
  uploadHandler = async ({ user: uploadUser, resourceId, file }) => uploadResourceAsset({ user: uploadUser, resourceId, file }),
  registerHandler = async (input) => registerUploadedResourceAsset(input),
}: CreateTeacherResourceCoreInput): Promise<TeacherResourceActionResult> {
  const runtimePrisma = prismaClient ?? await getPrismaClient();
  try {
    if (!user.id) {
      return { ok: false, code: "UNAUTHENTICATED", message: "You need to sign in before creating a resource.", retryable: false };
    }
    if (!user.roles.includes("TEACHER") && !user.roles.includes("ADMIN")) {
      return { ok: false, code: "FORBIDDEN", message: "Only teachers and admins can create resources.", retryable: false };
    }
    const chapterId = required(formData, "chapterId");
    const resourceTypeId = required(formData, "resourceTypeId");
    const title = required(formData, "title");
    const format = required(formData, "format") as ResourceFormat;
    const sourceType = optional(formData, "sourceType") || (format === "PDF" ? "native-pdf" : "external-url");
    const contentUrl = optional(formData, "contentUrl");
    const externalUrl = optional(formData, "externalUrl");
    const textContent = optional(formData, "textContent");
    const thumbnailUrl = optional(formData, "thumbnailUrl");
    if (![contentUrl, externalUrl, thumbnailUrl].every(isHttpUrl)) throw new Error("All URLs must start with http:// or https://.");
    if (format === "PDF") {
      if (!["native-pdf", "external-url"].includes(sourceType)) {
        throw new Error("Selected PDF source type is invalid.");
      }
      if (sourceType === "native-pdf") {
        const file = formData.get("file");
        if (!(file instanceof File) || file.size === 0) {
          return { ok: false, code: "INVALID_FILE", message: "Please select a PDF file to upload.", retryable: false };
        }
      } else if (!externalUrl) {
        throw new Error("PDF URL is required for external PDF resources.");
      }
    } else if (format === "ARTICLE" && !textContent) {
      throw new Error("Article content is required.");
    } else if (format === "EXTERNAL_LINK" && !externalUrl) {
      throw new Error("External URL is required.");
    } else if (!["ARTICLE", "EXTERNAL_LINK"].includes(format) && !contentUrl) {
      throw new Error("Content URL is required for this format.");
    }

    const [teacherProfile, chapter, resourceType] = await Promise.all([
      runtimePrisma.teacherProfile.findUnique({ where: { userId: user.id }, select: { id: true } }),
      runtimePrisma.chapter.findFirst({ where: { id: chapterId, isActive: true }, select: { id: true } }),
      runtimePrisma.resourceType.findFirst({ where: { id: resourceTypeId, isActive: true }, select: { id: true } }),
    ]);
    if (!teacherProfile && !user.roles.includes("ADMIN")) throw new Error("Teacher profile is missing.");
    if (!chapter) throw new Error("Selected chapter is unavailable.");
    if (!resourceType) throw new Error("Selected resource type is unavailable.");

    const requestedStatus = required(formData, "status") as PublicationStatus;
    const safeStatus: PublicationStatus = user.roles.includes("ADMIN") && requestedStatus === "PUBLISHED" ? "PUBLISHED" : requestedStatus === "DRAFT" ? "DRAFT" : "PENDING_REVIEW";
    const slug = await uniqueSlug(runtimePrisma, chapterId, title);
    const initialStatus: PublicationStatus = format === "PDF" && sourceType === "native-pdf" ? "DRAFT" : safeStatus;
    const createdResource = await runtimePrisma.resource.create({ data: {
      chapterId,
      resourceTypeId,
      createdByUserId: user.id,
      title,
      titleHindi: optional(formData, "titleHindi"),
      slug,
      description: optional(formData, "description"),
      language: required(formData, "language") as ContentLanguage,
      format,
      access: required(formData, "access") as ResourceAccess,
      status: initialStatus,
      contentUrl: format === "PDF" ? null : contentUrl,
      externalUrl: format === "PDF" && sourceType === "native-pdf" ? null : externalUrl,
      thumbnailUrl,
      textContent,
      pageCount: optionalInt(formData, "pageCount"),
      durationSeconds: (optionalInt(formData, "durationMinutes") ?? 0) * 60 || null,
      sortOrder: optionalInt(formData, "sortOrder") ?? 0,
      publishedAt: initialStatus === "PUBLISHED" ? new Date() : null,
      teachers: teacherProfile ? { create: { teacherProfileId: teacherProfile.id, isPrimary: true } } : undefined,
    } });

    if (format === "PDF" && sourceType === "native-pdf") {
      const file = formData.get("file");
      if (!(file instanceof File)) {
        await runtimePrisma.resource.delete({ where: { id: createdResource.id } });
        return { ok: false, code: "INVALID_FILE", message: "Please select a PDF file to upload.", retryable: false };
      }
      const uploadResult = await uploadHandler({ user, resourceId: createdResource.id, file });
      if (!uploadResult.ok) {
        await runtimePrisma.resource.delete({ where: { id: createdResource.id } });
        await revalidateResourcePaths();
        return { ok: false, code: uploadResult.code, message: uploadResult.message, retryable: true };
      }
      if (safeStatus !== "DRAFT") {
        await runtimePrisma.resource.update({ where: { id: createdResource.id }, data: { status: safeStatus, publishedAt: safeStatus === "PUBLISHED" ? new Date() : null, updatedAt: new Date() } });
      }
      await revalidateResourcePaths();
      return { ok: true, message: "Resource saved and PDF uploaded successfully.", resourceId: createdResource.id };
    }

    await revalidateResourcePaths();
    return { ok: true, message: "Resource saved successfully.", resourceId: createdResource.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save resource.";
    return { ok: false, code: "INVALID_INPUT", message, resourceId: undefined, retryable: false };
  }
}

export async function createTeacherResource(formData: FormData): Promise<TeacherResourceActionResult> {
  const user = await requireAnyCurrentRole(["TEACHER", "ADMIN"]);
  const request = new Request("http://rate-limit.internal", { headers: await headers() });
  const ip = resolveRequestClientIp(request);
  if (!ip.ok) return { ok: false, code: "RATE_LIMITED", message: "Too many requests. Please wait before trying again.", retryable: true, retryAfterSeconds: 1 };
  const nativePdf = formData.get("format") === "PDF" && formData.get("sourceType") === "native-pdf";
  const decision = await enforceRateLimitChecks([
    { policy: "resource-create-user", identifier: user.id },
    { policy: "resource-create-ip", identifier: ip.address },
    ...(nativePdf ? [
      { policy: "pdf-upload-user" as const, identifier: user.id },
      { policy: "pdf-upload-ip" as const, identifier: ip.address },
    ] : []),
  ]);
  if (decision) return { ok: false, code: "RATE_LIMITED", message: "Too many requests. Please wait before trying again.", retryable: true, retryAfterSeconds: Math.max(1, decision.retryAfterSeconds) };
  return createTeacherResourceCore({ user, formData });
}

export async function uploadTeacherResourcePdf(formData: FormData) {
  const user = await requireAnyCurrentRole(["TEACHER", "ADMIN"]);
  const request = new Request("http://rate-limit.internal", { headers: await headers() });
  const ip = resolveRequestClientIp(request);
  if (!ip.ok) return { ok: false as const, code: "RATE_LIMITED", message: "Too many requests. Please wait before trying again.", retryAfterSeconds: 1 };
  const decision = await enforceRateLimitChecks([
    { policy: "pdf-upload-user", identifier: user.id },
    { policy: "pdf-upload-ip", identifier: ip.address },
  ]);
  if (decision) return { ok: false as const, code: "RATE_LIMITED", message: "Too many requests. Please wait before trying again.", retryAfterSeconds: Math.max(1, decision.retryAfterSeconds) };
  const resourceId = required(formData, "resourceId");
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { ok: false as const, code: "INVALID_FILE", message: "Please select a PDF file to upload." };
  }

  const result = await uploadResourceAsset({ user, resourceId, file });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true as const,
    assetId: result.assetId,
    message: "PDF uploaded successfully.",
  };
}

async function transitionTeacherResourceAction(formData: FormData, transition: TeacherResourceTransition): Promise<void> {
  const user = await requireAnyCurrentRole(["TEACHER", "ADMIN"]);
  const resourceId = required(formData, "resourceId");
  const authorization = await authorizeTeacherMutation(user, resourceId, transition);
  if (authorization.code === "NOT_FOUND") redirect("/teacher/resources?error=not-found");
  if (authorization.code === "RATE_LIMITED") redirect(`/teacher/resources/${resourceId}?error=rate-limited&retryAfter=${authorization.retryAfterSeconds}`);
  const result = await transitionTeacherResource({ user, resourceId, transition });
  if (!result.ok) throw new Error(result.message);
  await revalidateResourcePaths();
  revalidatePath(`/teacher/resources/${resourceId}`);
}

export async function submitTeacherResource(formData: FormData) {
  await transitionTeacherResourceAction(formData, "SUBMIT");
}

export async function resubmitTeacherResource(formData: FormData) {
  await transitionTeacherResourceAction(formData, "RESUBMIT");
}

export async function unpublishTeacherResource(formData: FormData) {
  await transitionTeacherResourceAction(formData, "UNPUBLISH");
}

export async function archiveTeacherResource(formData: FormData) {
  await transitionTeacherResourceAction(formData, "ARCHIVE");
}

export async function updateTeacherResource(formData: FormData) {
  const user = await requireAnyCurrentRole(["TEACHER", "ADMIN"]);
  const resourceId = required(formData, "resourceId");
  const { findEditableTeacherManagedResource } = await import("@/repositories/teacher-resource.repository");
  const current = await findEditableTeacherManagedResource(resourceId, user.id);
  if (!current) redirect(`/teacher/resources/${resourceId}?error=not-editable`);
  const authorization = await authorizeTeacherMutation(user, resourceId, "EDIT", { findOwned: async () => current });
  if (!authorization.ok) redirect(`/teacher/resources/${resourceId}?error=rate-limited&retryAfter=${"retryAfterSeconds" in authorization ? authorization.retryAfterSeconds : 1}`);
  const result = await updateTeacherResourceMetadata({
    user,
    resourceId,
    format: current.format,
    currentStatus: current.status,
    formData,
  });
  if (!result.ok) redirect(`/teacher/resources/${resourceId}/edit?error=${encodeURIComponent(result.message)}`);
  await revalidateResourcePaths();
  revalidatePath(`/teacher/resources/${resourceId}`);
  revalidatePath(`/teacher/resources/${resourceId}/edit`);
  redirect(`/teacher/resources/${resourceId}?updated=true`);
}
