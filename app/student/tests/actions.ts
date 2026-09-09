"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireCurrentRole } from "@/lib/auth/current-identity";
import { enforceRateLimitChecks } from "@/lib/rate-limit";
import { isSameOriginAction } from "@/lib/security/same-origin-action";
import { startPracticeTest } from "@/lib/practice-tests/start-test";
import { saveAttemptAnswers } from "@/repositories/practice-test.repository";

export type StartTestActionState = {
  status: "idle" | "error";
  message?: string;
};

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function startStudentPracticeTest(
  _previous: StartTestActionState,
  formData: FormData,
): Promise<StartTestActionState> {
  const headerList = await headers();
  if (!isSameOriginAction(headerList)) {
    return { status: "error", message: "This request could not be verified. Refresh and try again." };
  }
  const user = await requireCurrentRole("STUDENT");
  const limited = await enforceRateLimitChecks([{ policy: "student-test-start-user", identifier: user.id }]);
  if (limited) {
    return { status: "error", message: `Too many requests. Try again in about ${Math.max(1, limited.retryAfterSeconds)} seconds.` };
  }

  const result = await startPracticeTest({
    studentUserId: user.id,
    kind: text(formData, "kind"),
    boardId: text(formData, "boardId"),
    classLevelId: text(formData, "classLevelId"),
    subjectId: text(formData, "subjectId"),
    chapterIds: formData.getAll("chapterIds").flatMap((value) => (typeof value === "string" && value.trim() ? [value.trim()] : [])),
  });

  if (!result.ok) return { status: "error", message: result.message };
  redirect(`/student/tests/${result.attemptId}`);
}

export async function submitStudentPracticeTest(formData: FormData) {
  const headerList = await headers();
  if (!isSameOriginAction(headerList)) redirect("/student/tests");
  const user = await requireCurrentRole("STUDENT");
  const attemptId = text(formData, "attemptId");
  if (!attemptId) redirect("/student/tests");
  const limited = await enforceRateLimitChecks([{ policy: "student-test-submit-user", identifier: user.id }]);
  if (limited) redirect(`/student/tests/${attemptId}?error=limited`);

  const itemIds = formData.getAll("itemId").filter((value): value is string => typeof value === "string" && Boolean(value));
  const mapped = itemIds.map((itemId) => {
    const raw = formData.get(`answer-${itemId}`);
    const selectedOption = typeof raw === "string" ? Number(raw) : Number.NaN;
    return { itemId, selectedOption };
  }).filter((entry) => Number.isInteger(entry.selectedOption) && entry.selectedOption >= 0 && entry.selectedOption <= 3);

  const saved = await saveAttemptAnswers(attemptId, user.id, mapped);
  if (!saved) redirect("/student/tests");
  redirect(`/student/tests/${attemptId}/result`);
}
