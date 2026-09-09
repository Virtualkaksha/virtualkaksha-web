"use server";

import { headers } from "next/headers";

import { requireAnyCurrentRole } from "@/lib/auth/current-identity";
import { enforceRateLimitChecks, resolveRequestClientIp } from "@/lib/rate-limit";
import { isSameOriginAction } from "@/lib/security/same-origin-action";
import { createPracticeQuestion, findTeacherQuestionChapters } from "@/repositories/practice-test.repository";

export type TeacherQuestionActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function createTeacherPracticeQuestion(formData: FormData): Promise<TeacherQuestionActionResult> {
  const headerList = await headers();
  if (!isSameOriginAction(headerList)) {
    return { ok: false, message: "This request could not be verified. Refresh and try again." };
  }

  const user = await requireAnyCurrentRole(["TEACHER", "ADMIN"]);
  const ip = resolveRequestClientIp(new Request("http://rate-limit.internal", { headers: headerList }));
  if (!ip.ok) return { ok: false, message: "Too many requests. Try again shortly." };
  const limited = await enforceRateLimitChecks([
    { policy: "resource-create-user", identifier: user.id },
    { policy: "resource-create-ip", identifier: ip.address },
  ]);
  if (limited) return { ok: false, message: `Too many requests. Try again in about ${Math.max(1, limited.retryAfterSeconds)} seconds.` };

  const prompt = text(formData, "prompt");
  const optionA = text(formData, "optionA");
  const optionB = text(formData, "optionB");
  const optionC = text(formData, "optionC");
  const optionD = text(formData, "optionD");
  const chapterId = text(formData, "chapterId");
  const correctRaw = Number(text(formData, "correctOption"));
  const explanation = text(formData, "explanation") || null;

  if (prompt.length < 8 || optionA.length < 1 || optionB.length < 1 || optionC.length < 1 || optionD.length < 1) {
    return { ok: false, message: "Enter the question and all four options." };
  }
  if (!Number.isInteger(correctRaw) || correctRaw < 0 || correctRaw > 3) {
    return { ok: false, message: "Mark which option is correct." };
  }

  const chapters = await findTeacherQuestionChapters();
  if (!chapters.some((chapter) => chapter.id === chapterId)) {
    return { ok: false, message: "Choose a valid chapter." };
  }

  const canPublish = user.roles.includes("ADMIN");
  await createPracticeQuestion({
    chapterId,
    createdByUserId: user.id,
    prompt,
    optionA,
    optionB,
    optionC,
    optionD,
    correctOption: correctRaw,
    explanation,
    status: canPublish ? "PUBLISHED" : "PENDING_REVIEW",
    reviewedByUserId: canPublish ? user.id : null,
  });

  return {
    ok: true,
    message: canPublish ? "Question published." : "Question submitted for admin review.",
  };
}
