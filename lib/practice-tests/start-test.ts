import "server-only";

import {
  allocateQuestionCount,
  parsePracticeTestRequest,
  pickBalancedQuestions,
} from "@/lib/practice-tests/generation";
import {
  createPracticeTestAttempt,
  findActiveChapters,
  findPublishedQuestionsForChapters,
  findStudentOpenAttempt,
} from "@/repositories/practice-test.repository";

export type StartPracticeTestResult =
  | { ok: true; attemptId: string }
  | { ok: false; code: "INVALID" | "IN_PROGRESS" | "NOT_ENOUGH"; message: string };

export async function startPracticeTest(input: {
  studentUserId: string;
  kind: string;
  boardId: string;
  classLevelId: string;
  subjectId: string;
  chapterIds: string[];
}): Promise<StartPracticeTestResult> {
  const parsed = parsePracticeTestRequest(input);
  if (!parsed.ok) return parsed;

  const open = await findStudentOpenAttempt(input.studentUserId);
  if (open) {
    return { ok: false, code: "IN_PROGRESS", message: "Finish your current test before starting another." };
  }

  const { kind, boardId, classLevelId, subjectId, chapterIds: uniqueChapterIds } = parsed.value;
  const needsSubject = kind !== "FULL_CLASS";

  const chapters = await findActiveChapters({
    boardId,
    classLevelId,
    subjectId: needsSubject && subjectId ? subjectId : undefined,
    chapterIds: kind === "CHAPTER" || kind === "COMBINED_CHAPTER" ? uniqueChapterIds : undefined,
  });

  if (kind === "CHAPTER" || kind === "COMBINED_CHAPTER") {
    if (chapters.length !== uniqueChapterIds.length) {
      return { ok: false, code: "INVALID", message: "Those chapters do not match the selected class and subject." };
    }
  }
  if ((kind === "SUBJECT" || kind === "FULL_CLASS") && chapters.length === 0) {
    return { ok: false, code: "NOT_ENOUGH", message: "No chapters are available for this selection yet." };
  }

  const chapterIds = chapters.map((chapter) => chapter.id);
  const bank = await findPublishedQuestionsForChapters(chapterIds);
  const count = allocateQuestionCount(kind, bank.length);
  if (!count) {
    return {
      ok: false,
      code: "NOT_ENOUGH",
      message: "Not enough published questions yet for this test. Teachers need to add more questions first.",
    };
  }

  const questions = pickBalancedQuestions(bank, count);
  const attempt = await createPracticeTestAttempt({
    studentUserId: input.studentUserId,
    kind,
    boardId,
    classLevelId,
    subjectId,
    chapterIds,
    questions,
  });

  return { ok: true, attemptId: attempt.id };
}
