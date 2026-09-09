import "server-only";

import prisma from "@/lib/prisma";
import type { PublicationStatus } from "@/app/generated/prisma/client";

const chapterSelect = {
  id: true,
  name: true,
  chapterNumber: true,
  slug: true,
  boardClassSubject: {
    select: {
      board: { select: { id: true, shortName: true, slug: true } },
      classLevel: { select: { id: true, name: true, slug: true, numericLevel: true } },
      subject: { select: { id: true, name: true, slug: true } },
    },
  },
} as const;

export async function findPracticeTestCatalogue() {
  const [boards, levels, subjects, chapters] = await Promise.all([
    prisma.board.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, shortName: true, slug: true },
    }),
    prisma.classLevel.findMany({
      where: { isActive: true, numericLevel: { gte: 6, lte: 12 } },
      orderBy: { numericLevel: "asc" },
      select: { id: true, name: true, slug: true, numericLevel: true },
    }),
    prisma.subject.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
    prisma.chapter.findMany({
      where: {
        isActive: true,
        boardClassSubject: {
          isActive: true,
          board: { isActive: true },
          classLevel: { isActive: true, numericLevel: { gte: 6, lte: 12 } },
          subject: { isActive: true },
        },
      },
      orderBy: [
        { boardClassSubject: { classLevel: { numericLevel: "asc" } } },
        { boardClassSubject: { subject: { sortOrder: "asc" } } },
        { sortOrder: "asc" },
      ],
      select: chapterSelect,
    }),
  ]);
  return { boards, levels, subjects, chapters };
}

export async function findTeacherQuestionChapters() {
  return prisma.chapter.findMany({
    where: {
      isActive: true,
      boardClassSubject: {
        isActive: true,
        board: { isActive: true },
        classLevel: { isActive: true },
        subject: { isActive: true },
      },
    },
    orderBy: [
      { boardClassSubject: { board: { sortOrder: "asc" } } },
      { boardClassSubject: { classLevel: { numericLevel: "asc" } } },
      { boardClassSubject: { subject: { sortOrder: "asc" } } },
      { sortOrder: "asc" },
    ],
    select: chapterSelect,
  });
}

export async function findTeacherQuestions(userId: string) {
  return prisma.practiceQuestion.findMany({
    where: { createdByUserId: userId },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      id: true,
      prompt: true,
      status: true,
      moderationNote: true,
      createdAt: true,
      chapter: { select: chapterSelect },
    },
  });
}

export async function createPracticeQuestion(input: {
  chapterId: string;
  createdByUserId: string;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: number;
  explanation?: string | null;
  status: PublicationStatus;
  reviewedByUserId?: string | null;
}) {
  const now = input.status === "PUBLISHED" ? new Date() : null;
  return prisma.practiceQuestion.create({
    data: {
      chapterId: input.chapterId,
      createdByUserId: input.createdByUserId,
      prompt: input.prompt,
      optionA: input.optionA,
      optionB: input.optionB,
      optionC: input.optionC,
      optionD: input.optionD,
      correctOption: input.correctOption,
      explanation: input.explanation ?? null,
      status: input.status,
      publishedAt: now,
      reviewedAt: now,
      reviewedByUserId: input.status === "PUBLISHED" ? input.reviewedByUserId ?? input.createdByUserId : null,
    },
    select: { id: true },
  });
}

export async function findAdminPracticeQuestions(status: string) {
  return prisma.practiceQuestion.findMany({
    where: status === "ALL" ? {} : { status: status as PublicationStatus },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      prompt: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      correctOption: true,
      explanation: true,
      status: true,
      moderationNote: true,
      createdAt: true,
      createdBy: { select: { email: true, firstName: true, lastName: true, displayName: true } },
      chapter: { select: chapterSelect },
    },
  });
}

export async function moderatePracticeQuestion(input: {
  questionId: string;
  adminId: string;
  status: "PUBLISHED" | "REJECTED";
  moderationNote?: string | null;
}) {
  const now = new Date();
  return prisma.practiceQuestion.updateMany({
    where: { id: input.questionId, status: "PENDING_REVIEW" },
    data: {
      status: input.status,
      reviewedByUserId: input.adminId,
      reviewedAt: now,
      publishedAt: input.status === "PUBLISHED" ? now : null,
      moderationNote: input.moderationNote ?? null,
    },
  });
}

export async function findPublishedQuestionsForChapters(chapterIds: string[]) {
  if (chapterIds.length === 0) return [];
  return prisma.practiceQuestion.findMany({
    where: { status: "PUBLISHED", chapterId: { in: chapterIds } },
    select: {
      id: true,
      chapterId: true,
      prompt: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      correctOption: true,
    },
  });
}

export async function findActiveChapters(input: {
  boardId: string;
  classLevelId: string;
  subjectId?: string;
  chapterIds?: string[];
}) {
  return prisma.chapter.findMany({
    where: {
      isActive: true,
      ...(input.chapterIds?.length ? { id: { in: input.chapterIds } } : {}),
      boardClassSubject: {
        isActive: true,
        boardId: input.boardId,
        classLevelId: input.classLevelId,
        ...(input.subjectId ? { subjectId: input.subjectId } : {}),
        board: { isActive: true },
        classLevel: { isActive: true },
        subject: { isActive: true },
      },
    },
    select: { id: true, boardClassSubject: { select: { subjectId: true } } },
  });
}

export async function findStudentOpenAttempt(studentUserId: string) {
  return prisma.practiceTestAttempt.findFirst({
    where: { studentUserId, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
    select: { id: true, kind: true, startedAt: true },
  });
}

export async function findStudentAttempts(studentUserId: string) {
  return prisma.practiceTestAttempt.findMany({
    where: { studentUserId },
    orderBy: { startedAt: "desc" },
    take: 12,
    select: {
      id: true,
      kind: true,
      status: true,
      scoreCorrect: true,
      scoreTotal: true,
      startedAt: true,
      submittedAt: true,
      classLevel: { select: { name: true } },
      subject: { select: { name: true } },
    },
  });
}

export async function createPracticeTestAttempt(input: {
  studentUserId: string;
  kind: "CHAPTER" | "COMBINED_CHAPTER" | "SUBJECT" | "FULL_CLASS";
  boardId: string;
  classLevelId: string;
  subjectId: string | null;
  chapterIds: string[];
  questions: Array<{
    id: string;
    prompt: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: number;
  }>;
}) {
  const attempt = await prisma.practiceTestAttempt.create({
    data: {
      studentUserId: input.studentUserId,
      kind: input.kind,
      boardId: input.boardId,
      classLevelId: input.classLevelId,
      subjectId: input.subjectId,
      scoreTotal: input.questions.length,
    },
    select: { id: true },
  });

  if (input.chapterIds.length) {
    await prisma.practiceTestAttemptChapter.createMany({
      data: input.chapterIds.map((chapterId) => ({ attemptId: attempt.id, chapterId })),
    });
  }

  await prisma.practiceTestAttemptItem.createMany({
    data: input.questions.map((question, index) => ({
      attemptId: attempt.id,
      questionId: question.id,
      sortOrder: index + 1,
      prompt: question.prompt,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      correctOption: question.correctOption,
    })),
  });

  return attempt;
}

export async function findOwnedAttempt(attemptId: string, studentUserId: string) {
  return prisma.practiceTestAttempt.findFirst({
    where: { id: attemptId, studentUserId },
    select: {
      id: true,
      kind: true,
      status: true,
      scoreCorrect: true,
      scoreTotal: true,
      startedAt: true,
      submittedAt: true,
      classLevel: { select: { name: true } },
      subject: { select: { name: true } },
      chapters: { select: { chapter: { select: { name: true } } } },
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          sortOrder: true,
          prompt: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
          correctOption: true,
          selectedOption: true,
        },
      },
    },
  });
}

export async function saveAttemptAnswers(
  attemptId: string,
  studentUserId: string,
  answers: Array<{ itemId: string; selectedOption: number }>,
) {
  const attempt = await prisma.practiceTestAttempt.findFirst({
    where: { id: attemptId, studentUserId, status: "IN_PROGRESS" },
    select: { id: true, items: { select: { id: true, correctOption: true } } },
  });
  if (!attempt) return null;

  let correct = 0;
  for (const item of attempt.items) {
    const answer = answers.find((entry) => entry.itemId === item.id);
    const selected = answer && answer.selectedOption >= 0 && answer.selectedOption <= 3 ? answer.selectedOption : null;
    if (selected === item.correctOption) correct += 1;
    await prisma.practiceTestAttemptItem.updateMany({
      where: { id: item.id, attemptId },
      data: { selectedOption: selected },
    });
  }

  await prisma.practiceTestAttempt.updateMany({
    where: { id: attemptId, studentUserId, status: "IN_PROGRESS" },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      scoreCorrect: correct,
      scoreTotal: attempt.items.length,
    },
  });

  return { correct, total: attempt.items.length };
}
