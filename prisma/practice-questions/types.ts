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

export function class12Pyq(
  subjectSlug: "physics" | "chemistry" | "mathematics",
  chapterSlug: string,
  prompt: string,
  options: [string, string, string, string],
  correctOption: 0 | 1 | 2 | 3,
  explanation: string,
): PracticeQuestionSeed {
  return {
    boardSlug: "cbse",
    classSlug: "class-12",
    subjectSlug,
    chapterSlug,
    prompt,
    options,
    correctOption,
    explanation,
  };
}

export function assertTwentyPerChapter(questions: PracticeQuestionSeed[], expectedChapters: string[]) {
  const counts = new Map<string, number>();
  for (const question of questions) {
    counts.set(question.chapterSlug, (counts.get(question.chapterSlug) ?? 0) + 1);
  }
  for (const slug of expectedChapters) {
    const count = counts.get(slug) ?? 0;
    if (count !== 20) {
      throw new Error(`Expected 20 questions for ${slug}, found ${count}.`);
    }
  }
  if (counts.size !== expectedChapters.length) {
    throw new Error(`Unexpected chapters in question bank: ${[...counts.keys()].join(", ")}`);
  }
}
