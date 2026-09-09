export const PRACTICE_TEST_KINDS = ["CHAPTER", "COMBINED_CHAPTER", "SUBJECT", "FULL_CLASS"] as const;

export type PracticeTestKind = (typeof PRACTICE_TEST_KINDS)[number];

export const PRACTICE_TEST_SIZE: Record<PracticeTestKind, number> = {
  CHAPTER: 10,
  COMBINED_CHAPTER: 15,
  SUBJECT: 20,
  FULL_CLASS: 25,
};

export const PRACTICE_TEST_MINIMUM: Record<PracticeTestKind, number> = {
  CHAPTER: 5,
  COMBINED_CHAPTER: 8,
  SUBJECT: 10,
  FULL_CLASS: 12,
};

export const COMBINED_CHAPTER_MIN = 2;
export const COMBINED_CHAPTER_MAX = 3;

export function isPracticeTestKind(value: string): value is PracticeTestKind {
  return (PRACTICE_TEST_KINDS as readonly string[]).includes(value);
}

export type ParsedPracticeTestRequest = {
  kind: PracticeTestKind;
  boardId: string;
  classLevelId: string;
  subjectId: string | null;
  chapterIds: string[];
};

export function parsePracticeTestRequest(input: {
  kind: string;
  boardId: string;
  classLevelId: string;
  subjectId: string;
  chapterIds: string[];
}): { ok: true; value: ParsedPracticeTestRequest } | { ok: false; code: "INVALID"; message: string } {
  if (!isPracticeTestKind(input.kind) || !input.boardId.trim() || !input.classLevelId.trim()) {
    return { ok: false, code: "INVALID", message: "Choose a class and test type to continue." };
  }

  const kind = input.kind;
  const needsSubject = kind !== "FULL_CLASS";
  const subjectId = input.subjectId.trim();
  if (needsSubject && !subjectId) {
    return { ok: false, code: "INVALID", message: "Choose a subject for this test." };
  }

  const chapterIds = [...new Set(input.chapterIds.map((value) => value.trim()).filter(Boolean))];
  if (kind === "CHAPTER" && chapterIds.length !== 1) {
    return { ok: false, code: "INVALID", message: "Choose one chapter for a chapter test." };
  }
  if (
    kind === "COMBINED_CHAPTER"
    && (chapterIds.length < COMBINED_CHAPTER_MIN || chapterIds.length > COMBINED_CHAPTER_MAX)
  ) {
    return { ok: false, code: "INVALID", message: "Choose two or three chapters for a combined test." };
  }

  return {
    ok: true,
    value: {
      kind,
      boardId: input.boardId.trim(),
      classLevelId: input.classLevelId.trim(),
      subjectId: needsSubject ? subjectId : null,
      chapterIds,
    },
  };
}

export function allocateQuestionCount(kind: PracticeTestKind, available: number) {
  if (available < PRACTICE_TEST_MINIMUM[kind]) return 0;
  return Math.min(PRACTICE_TEST_SIZE[kind], available);
}

export function shuffleInPlace<T>(items: T[], random: () => number = Math.random) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    const current = items[index]!;
    items[index] = items[swapWith]!;
    items[swapWith] = current;
  }
  return items;
}

export function pickBalancedQuestions<T extends { chapterId: string }>(
  questions: T[],
  count: number,
  random: () => number = Math.random,
) {
  if (count <= 0 || questions.length === 0) return [];
  const byChapter = new Map<string, T[]>();
  for (const question of questions) {
    const bucket = byChapter.get(question.chapterId) ?? [];
    bucket.push(question);
    byChapter.set(question.chapterId, bucket);
  }
  for (const bucket of byChapter.values()) shuffleInPlace(bucket, random);
  const buckets = [...byChapter.values()];
  const picked: T[] = [];
  let cursor = 0;
  while (picked.length < count && buckets.some((bucket) => bucket.length > 0)) {
    const bucket = buckets[cursor % buckets.length]!;
    const next = bucket.shift();
    if (next) picked.push(next);
    cursor += 1;
  }
  return picked;
}

export function scoreAttemptItems(items: Array<{ selectedOption: number | null; correctOption: number }>) {
  const answered = items.filter((item) => item.selectedOption !== null);
  const correct = answered.filter((item) => item.selectedOption === item.correctOption).length;
  return { correct, total: items.length };
}
