"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/session";
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

export async function approveResource(formData: FormData) {
  const admin = await requireAdmin(); const resourceId = field(formData, "resourceId");
  if (!resourceId) throw new Error("Resource ID is required.");
  await prisma.resource.update({ where: { id: resourceId }, data: {
    status: "PUBLISHED", publishedAt: new Date(), reviewedAt: new Date(), reviewedByUserId: admin.id, moderationNote: null,
  } });
  await refresh(resourceId); redirect(`/admin/resources/${resourceId}?approved=true`);
}

export async function rejectResource(formData: FormData) {
  const admin = await requireAdmin(); const resourceId = field(formData, "resourceId"); const reason = field(formData, "reason");
  if (!resourceId) throw new Error("Resource ID is required.");
  if (reason.length < 10) throw new Error("Rejection reason must contain at least 10 characters.");
  await prisma.resource.update({ where: { id: resourceId }, data: {
    status: "REJECTED", publishedAt: null, reviewedAt: new Date(), reviewedByUserId: admin.id, moderationNote: reason,
  } });
  await refresh(resourceId); redirect(`/admin/resources/${resourceId}?rejected=true`);
}

export async function archiveResource(formData: FormData) {
  const admin = await requireAdmin(); const resourceId = field(formData, "resourceId");
  if (!resourceId) throw new Error("Resource ID is required.");
  await prisma.resource.update({ where: { id: resourceId }, data: {
    status: "ARCHIVED", publishedAt: null, reviewedAt: new Date(), reviewedByUserId: admin.id,
  } });
  await refresh(resourceId); redirect("/admin/resources?archived=true");
}
