import assert from "node:assert/strict";
import test from "node:test";

import {
  allocateQuestionCount,
  parsePracticeTestRequest,
  pickBalancedQuestions,
  scoreAttemptItems,
} from "@/lib/practice-tests/generation";

test("a chapter test needs at least five published questions", () => {
  assert.equal(allocateQuestionCount("CHAPTER", 4), 0);
  assert.equal(allocateQuestionCount("CHAPTER", 5), 5);
  assert.equal(allocateQuestionCount("CHAPTER", 40), 10);
  assert.equal(allocateQuestionCount("COMBINED_CHAPTER", 7), 0);
  assert.equal(allocateQuestionCount("COMBINED_CHAPTER", 8), 8);
  assert.equal(allocateQuestionCount("SUBJECT", 20), 20);
  assert.equal(allocateQuestionCount("FULL_CLASS", 12), 12);
  assert.equal(allocateQuestionCount("FULL_CLASS", 40), 25);
});

test("question picking mixes chapters instead of draining one bucket first", () => {
  const questions = [
    { id: "a1", chapterId: "ch-a" },
    { id: "a2", chapterId: "ch-a" },
    { id: "b1", chapterId: "ch-b" },
    { id: "b2", chapterId: "ch-b" },
  ];
  const picked = pickBalancedQuestions(questions, 4, () => 0);
  assert.equal(picked.length, 4);
  assert.equal(new Set(picked.map((item) => item.chapterId)).size, 2);
});

test("attempt scoring counts only exact option matches", () => {
  assert.deepEqual(
    scoreAttemptItems([
      { selectedOption: 1, correctOption: 1 },
      { selectedOption: 0, correctOption: 2 },
      { selectedOption: null, correctOption: 3 },
    ]),
    { correct: 1, total: 3 },
  );
});

test("start-test form parsing requires the right chapters for each kind", () => {
  const base = { boardId: "board-1", classLevelId: "class-1", subjectId: "science-1" };
  assert.equal(parsePracticeTestRequest({ ...base, kind: "CHAPTER", chapterIds: [] }).ok, false);
  assert.equal(parsePracticeTestRequest({ ...base, kind: "COMBINED_CHAPTER", chapterIds: ["ch-1"] }).ok, false);
  assert.equal(parsePracticeTestRequest({ ...base, kind: "SUBJECT", chapterIds: [] }).ok, true);
  const fullClass = parsePracticeTestRequest({
    kind: "FULL_CLASS",
    boardId: "board-1",
    classLevelId: "class-1",
    subjectId: "ignored",
    chapterIds: [],
  });
  assert.equal(fullClass.ok, true);
  if (fullClass.ok) assert.equal(fullClass.value.subjectId, null);
});
