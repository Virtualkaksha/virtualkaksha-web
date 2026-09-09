"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentRole } from "@/lib/auth/current-identity";
import { limitAdminModeration } from "@/lib/admin/moderation-rate-limit";
import { isSameOriginAction } from "@/lib/security/same-origin-action";
import { moderatePracticeQuestion } from "@/repositories/practice-test.repository";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function approvePracticeQuestion(formData: FormData) {
  if (!isSameOriginAction(await headers())) redirect("/admin/questions");
  const admin = await requireCurrentRole("ADMIN");
  const questionId = field(formData, "questionId");
  if (!questionId) redirect("/admin/questions");
  const limited = await limitAdminModeration(admin.id, questionId, "APPROVE");
  if (!limited.allowed) redirect(`/admin/questions?rateLimited=1`);
  await moderatePracticeQuestion({ questionId, adminId: admin.id, status: "PUBLISHED" });
  revalidatePath("/admin/questions");
  revalidatePath("/student/tests");
  redirect("/admin/questions?approved=1");
}

export async function rejectPracticeQuestion(formData: FormData) {
  if (!isSameOriginAction(await headers())) redirect("/admin/questions");
  const admin = await requireCurrentRole("ADMIN");
  const questionId = field(formData, "questionId");
  const reason = field(formData, "reason");
  if (!questionId) redirect("/admin/questions");
  if (reason.length < 10) redirect(`/admin/questions?error=reason`);
  const limited = await limitAdminModeration(admin.id, questionId, "REJECT");
  if (!limited.allowed) redirect(`/admin/questions?rateLimited=1`);
  await moderatePracticeQuestion({ questionId, adminId: admin.id, status: "REJECTED", moderationNote: reason });
  revalidatePath("/admin/questions");
  redirect("/admin/questions?rejected=1");
}
