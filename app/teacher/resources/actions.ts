"use server";

import { revalidatePath } from "next/cache";
import { ContentLanguage, PublicationStatus, ResourceAccess, ResourceFormat } from "@/app/generated/prisma/client";
import { uploadResourceAsset, type UploadResourceAssetResult } from "@/lib/resources/upload-service";

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
  | { ok: false; code: string; message: string; resourceId?: string; retryable: boolean };

type TeacherUser = { id: string; roles: string[] };

type CreateTeacherResourceCoreInput = {
  user: TeacherUser;
  formData: FormData;
  prismaClient?: TeacherResourcePrismaClient;
  uploadHandler?: (input: { user: TeacherUser; resourceId: string; file: File }) => Promise<UploadResourceAssetResult>;
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
  } catch {
    // noop in non-Next runtime environments such as tests
  }
}

export async function createTeacherResourceCore({ user, formData, prismaClient, uploadHandler = async ({ user: uploadUser, resourceId, file }) => uploadResourceAsset({ user: uploadUser, resourceId, file }) }: CreateTeacherResourceCoreInput): Promise<TeacherResourceActionResult> {
  const runtimePrisma = prismaClient ?? await getPrismaClient();
  try {
    const chapterId = required(formData, "chapterId");
    const resourceTypeId = required(formData, "resourceTypeId");
    const title = required(formData, "title");
    const format = required(formData, "format") as ResourceFormat;
    const sourceType = optional(formData, "sourceType") || "external-url";
    const contentUrl = optional(formData, "contentUrl");
    const externalUrl = optional(formData, "externalUrl");
    const textContent = optional(formData, "textContent");
    const thumbnailUrl = optional(formData, "thumbnailUrl");
    if (![contentUrl, externalUrl, thumbnailUrl].every(isHttpUrl)) throw new Error("All URLs must start with http:// or https://.");
    if (format === "ARTICLE" && !textContent) throw new Error("Article content is required.");
    if (format === "EXTERNAL_LINK" && !externalUrl) throw new Error("External URL is required.");
    if (format === "PDF" && sourceType === "native-pdf") {
      // File is validated during the upload step after the draft resource is created.
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
      contentUrl: format === "PDF" && sourceType === "native-pdf" ? null : contentUrl,
      externalUrl,
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
        await runtimePrisma.resource.update({ where: { id: createdResource.id }, data: { status: "DRAFT", updatedAt: new Date() } });
        await revalidateResourcePaths();
        return { ok: false, code: "INVALID_FILE", message: "Please select a PDF file to upload.", resourceId: createdResource.id, retryable: true };
      }
      const uploadResult = await uploadHandler({ user, resourceId: createdResource.id, file });
      if (!uploadResult.ok) {
        await runtimePrisma.resource.update({ where: { id: createdResource.id }, data: { status: "DRAFT", updatedAt: new Date() } });
        await revalidateResourcePaths();
        return { ok: false, code: uploadResult.code, message: uploadResult.message, resourceId: createdResource.id, retryable: true };
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
  const { requireTeacher } = await import("@/lib/auth/session");
  const user = await requireTeacher();
  return createTeacherResourceCore({ user, formData });
}

export async function uploadTeacherResourcePdf(formData: FormData) {
  const { requireTeacher } = await import("@/lib/auth/session");
  const user = await requireTeacher();
  const resourceId = required(formData, "resourceId");
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { ok: false as const, code: "INVALID_FILE", message: "Please select a PDF file to upload." };
  }

  return uploadResourceAsset({ user, resourceId, file });
}

export async function archiveTeacherResource(formData: FormData) {
  const { requireTeacher } = await import("@/lib/auth/session");
  const user = await requireTeacher(); const resourceId = required(formData, "resourceId");
  const runtimePrisma = await getPrismaClient();
  await runtimePrisma.resource.updateMany({ where: { id: resourceId, OR: [{ createdByUserId: user.id }, { teachers: { some: { teacherProfile: { userId: user.id } } } }] }, data: { status: "ARCHIVED" } });
  await revalidateResourcePaths();
}
