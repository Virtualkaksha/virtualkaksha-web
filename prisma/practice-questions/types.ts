export type PracticeQuestionSeed = {
  boardSlug: string;
  classSlug: string;
  subjectSlug: string;
  chapterSlug: string;
  prompt: string;
  options: [string, string, string, string];
  correctOption: 0 | 1 | 2 | 3;
  explanation: string;
};

export function cbsePyq(
  classSlug: "class-6" | "class-7" | "class-8" | "class-9" | "class-10" | "class-11" | "class-12",
  subjectSlug: string,
  chapterSlug: string,
  prompt: string,
  options: [string, string, string, string],
  correctOption: 0 | 1 | 2 | 3,
  explanation: string,
): PracticeQuestionSeed {
  return {
    boardSlug: "cbse",
    classSlug,
    subjectSlug,
    chapterSlug,
    prompt,
    options,
    correctOption,
    explanation,
  };
}

export function class12Pyq(
  subjectSlug: "physics" | "chemistry" | "mathematics",
  chapterSlug: string,
  prompt: string,
  options: [string, string, string, string],
  correctOption: 0 | 1 | 2 | 3,
  explanation: string,
): PracticeQuestionSeed {
  return cbsePyq("class-12", subjectSlug, chapterSlug, prompt, options, correctOption, explanation);
}

export function assertTwentyPerChapter(questions: PracticeQuestionSeed[], expectedChapters: string[]) {
  assertCountPerChapter(questions, expectedChapters, 20);
}

export function assertThirtyPerChapter(questions: PracticeQuestionSeed[], expectedChapters: string[]) {
  assertCountPerChapter(questions, expectedChapters, 30);
}

export function assertCountPerChapter(
  questions: PracticeQuestionSeed[],
  expectedChapters: string[],
  expectedCount: number,
) {
  const counts = new Map<string, number>();
  for (const question of questions) {
    counts.set(question.chapterSlug, (counts.get(question.chapterSlug) ?? 0) + 1);
  }
  for (const slug of expectedChapters) {
    const count = counts.get(slug) ?? 0;
    if (count !== expectedCount) {
      throw new Error(`Expected ${expectedCount} questions for ${slug}, found ${count}.`);
    }
  }
  if (counts.size !== expectedChapters.length) {
    throw new Error(`Unexpected chapters in question bank: ${[...counts.keys()].join(", ")}`);
  }
}
