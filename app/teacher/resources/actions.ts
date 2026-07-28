"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ContentLanguage, PublicationStatus, ResourceAccess, ResourceFormat } from "@/app/generated/prisma/client";
import { requireTeacher } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { uploadResourceAsset } from "@/lib/resources/upload-service";

function required(formData: FormData, name: string) { const value = formData.get(name); if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required.`); return value.trim(); }
function optional(formData: FormData, name: string) { const value = formData.get(name); return typeof value === "string" && value.trim() ? value.trim() : null; }
function optionalInt(formData: FormData, name: string) { const value = optional(formData, name); if (!value) return null; const result = Number.parseInt(value, 10); if (!Number.isInteger(result) || result < 0) throw new Error(`${name} must be zero or greater.`); return result; }
function slugify(value: string) { return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function isHttpUrl(value: string | null) { if (!value) return true; try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:"; } catch { return false; } }
async function uniqueSlug(chapterId: string, title: string) { const base = slugify(title) || `resource-${Date.now()}`; for (let attempt = 1; attempt < 100; attempt += 1) { const slug = attempt === 1 ? base : `${base}-${attempt}`; const match = await prisma.resource.findFirst({ where: { chapterId, slug }, select: { id: true } }); if (!match) return slug; } return `${base}-${Date.now()}`; }

export async function createTeacherResource(formData: FormData) {
  const user = await requireTeacher();
  try {
    const chapterId = required(formData, "chapterId");
    const resourceTypeId = required(formData, "resourceTypeId");
    const title = required(formData, "title");
    const format = required(formData, "format") as ResourceFormat;
    const contentUrl = optional(formData, "contentUrl");
    const externalUrl = optional(formData, "externalUrl");
    const textContent = optional(formData, "textContent");
    const thumbnailUrl = optional(formData, "thumbnailUrl");
    if (![contentUrl, externalUrl, thumbnailUrl].every(isHttpUrl)) throw new Error("All URLs must start with http:// or https://.");
    if (format === "ARTICLE" && !textContent) throw new Error("Article content is required.");
    if (format === "EXTERNAL_LINK" && !externalUrl) throw new Error("External URL is required.");
    if (!["ARTICLE", "EXTERNAL_LINK"].includes(format) && !contentUrl) throw new Error("Content URL is required for this format.");

    const [teacherProfile, chapter, resourceType] = await Promise.all([
      prisma.teacherProfile.findUnique({ where: { userId: user.id }, select: { id: true } }),
      prisma.chapter.findFirst({ where: { id: chapterId, isActive: true }, select: { id: true } }),
      prisma.resourceType.findFirst({ where: { id: resourceTypeId, isActive: true }, select: { id: true } }),
    ]);
    if (!teacherProfile && !user.roles.includes("ADMIN")) throw new Error("Teacher profile is missing.");
    if (!chapter) throw new Error("Selected chapter is unavailable.");
    if (!resourceType) throw new Error("Selected resource type is unavailable.");

    const requestedStatus = required(formData, "status") as PublicationStatus;
    const safeStatus: PublicationStatus = user.roles.includes("ADMIN") && requestedStatus === "PUBLISHED" ? "PUBLISHED" : requestedStatus === "DRAFT" ? "DRAFT" : "PENDING_REVIEW";
    const slug = await uniqueSlug(chapterId, title);

    await prisma.resource.create({ data: { chapterId, resourceTypeId, createdByUserId: user.id, title, titleHindi: optional(formData, "titleHindi"), slug, description: optional(formData, "description"), language: required(formData, "language") as ContentLanguage, format, access: required(formData, "access") as ResourceAccess, status: safeStatus, contentUrl, externalUrl, thumbnailUrl, textContent, pageCount: optionalInt(formData, "pageCount"), durationSeconds: (optionalInt(formData, "durationMinutes") ?? 0) * 60 || null, sortOrder: optionalInt(formData, "sortOrder") ?? 0, publishedAt: safeStatus === "PUBLISHED" ? new Date() : null, teachers: teacherProfile ? { create: { teacherProfileId: teacherProfile.id, isPrimary: true } } : undefined } });
    revalidatePath("/teacher"); revalidatePath("/teacher/resources"); revalidatePath("/student/resources");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save resource.";
    redirect(`/teacher/resources?error=${encodeURIComponent(message)}`);
  }
  redirect("/teacher/resources?created=true");
}

export async function uploadTeacherResourcePdf(formData: FormData) {
  const user = await requireTeacher();
  const resourceId = required(formData, "resourceId");
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { ok: false as const, code: "INVALID_FILE", message: "Please select a PDF file to upload." };
  }

  return uploadResourceAsset({ user, resourceId, file });
}

export async function archiveTeacherResource(formData: FormData) {
  const user = await requireTeacher(); const resourceId = required(formData, "resourceId");
  await prisma.resource.updateMany({ where: { id: resourceId, OR: [{ createdByUserId: user.id }, { teachers: { some: { teacherProfile: { userId: user.id } } } }] }, data: { status: "ARCHIVED" } });
  revalidatePath("/teacher"); revalidatePath("/teacher/resources"); revalidatePath("/student/resources");
}
