"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/session";
import {
  transitionAdminResource,
} from "@/lib/admin/resource-moderation-policy";
import { limitAdminModeration, type AdminModerationAction } from "@/lib/admin/moderation-rate-limit";
import prisma from "@/lib/prisma";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

async function pathsFor(resourceId: string) {
  return prisma.resource.findUnique({ where: { id: resourceId }, select: { chapter: { select: { slug: true, boardClassSubject: { select: {
    board: { select: { slug: true } }, classLevel: { select: { slug: true } }, subject: { select: { slug: true } },
  } } } } } });
}

async function refresh(resourceId: string) {
  revalidatePath("/admin"); revalidatePath("/admin/resources"); revalidatePath(`/admin/resources/${resourceId}`);
  revalidatePath("/teacher"); revalidatePath("/teacher/resources"); revalidatePath("/student/resources");
  const data = await pathsFor(resourceId); const chapter = data?.chapter;
  if (chapter) revalidatePath(`/student/resources/${chapter.boardClassSubject.board.slug}/${chapter.boardClassSubject.classLevel.slug}/${chapter.boardClassSubject.subject.slug}/${chapter.slug}`);
}

async function enforceAdminMutation(adminId: string, resourceId: string, action: AdminModerationAction) {
  const result = await limitAdminModeration(adminId, resourceId, action);
  if (!result.allowed) redirect(`/admin/resources/${resourceId}?rateLimited=true&retryAfter=${result.retryAfterSeconds}`);
}

export async function approveResource(formData: FormData) {
  const admin = await requireAdmin(); const resourceId = field(formData, "resourceId");
  if (!resourceId) throw new Error("Resource ID is required.");
  await enforceAdminMutation(admin.id, resourceId, "APPROVE");
  await transitionAdminResource(
    { resourceId, adminId: admin.id, action: "APPROVE" },
    (update) => prisma.resource.updateMany(update),
  );
  await refresh(resourceId); redirect(`/admin/resources/${resourceId}?approved=true`);
}

export async function rejectResource(formData: FormData) {
  const admin = await requireAdmin(); const resourceId = field(formData, "resourceId"); const reason = field(formData, "reason");
  if (!resourceId) throw new Error("Resource ID is required.");
  if (reason.length < 10) throw new Error("Rejection reason must contain at least 10 characters.");
  await enforceAdminMutation(admin.id, resourceId, "REJECT");
  await transitionAdminResource(
    { resourceId, adminId: admin.id, action: "REJECT", reason },
    (update) => prisma.resource.updateMany(update),
  );
  await refresh(resourceId); redirect(`/admin/resources/${resourceId}?rejected=true`);
}

export async function archiveResource(formData: FormData) {
  const admin = await requireAdmin(); const resourceId = field(formData, "resourceId");
  if (!resourceId) throw new Error("Resource ID is required.");
  await enforceAdminMutation(admin.id, resourceId, "ARCHIVE");
  await transitionAdminResource(
    { resourceId, adminId: admin.id, action: "ARCHIVE" },
    (update) => prisma.resource.updateMany(update),
  );
  await refresh(resourceId); redirect("/admin/resources?archived=true");
}
