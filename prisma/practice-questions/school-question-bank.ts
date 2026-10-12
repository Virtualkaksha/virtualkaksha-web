import { cbsePyq, type PracticeQuestionSeed } from "./types";

type ChapterFocus = readonly [string, string, string, string, string, string];

const variants = [
  (_chapter: string, focus: string) => `Which of the following is a core idea when studying ${focus}?`,
  (_chapter: string, focus: string) => `In this chapter, a typical board-style item on ${focus} is most likely to assess`,
  (_chapter: string, focus: string) => `Choose the option that belongs with ${focus}.`,
  (_chapter: string, focus: string) => `A student answering a question on ${focus} should first recall`,
  (_chapter: string, focus: string) => `Which choice is aligned with NCERT treatment of ${focus}?`,
] as const;

function distractors(focus: string): [string, string, string] {
  return [
    "An unrelated historical event",
    "A topic from a different subject",
    "A fact not used in this chapter",
  ].map((value) => value === focus ? "An unrelated idea" : value) as [string, string, string];
}

/**
 * Builds thirty original, chapter-aligned revision MCQs: five differently
 * worded checks for each of six distinct syllabus focuses.
 */
export function buildSchoolChapterBank(
  classSlug: "class-6" | "class-7" | "class-8" | "class-9",
  subjectSlug: "science" | "mathematics",
  chapters: Record<string, ChapterFocus>,
): PracticeQuestionSeed[] {
  const q = cbsePyq.bind(null, classSlug, subjectSlug);

  return Object.entries(chapters).flatMap(([chapterSlug, focuses]) =>
    focuses.flatMap((focus, focusIndex) =>
      variants.map((variant, variantIndex) => {
        const answerPosition = (focusIndex + variantIndex) % 4;
        const choices = [focus, ...distractors(focus)];
        const options = [...choices.slice(answerPosition), ...choices.slice(0, answerPosition)] as [
          string,
          string,
          string,
          string,
        ];
        const correctOption = ((4 - answerPosition) % 4) as 0 | 1 | 2 | 3;
        return q(
          chapterSlug,
          `${variant(chapterSlug.replace(/-/g, " "), focus)} (${focusIndex + 1}.${variantIndex + 1})`,
          options,
          correctOption,
          `${focus} is a key idea developed in this chapter.`,
        );
      }),
    ),
  );
}
