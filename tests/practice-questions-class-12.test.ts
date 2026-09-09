import assert from "node:assert/strict";
import test from "node:test";

import { class10MathematicsQuestions } from "../prisma/practice-questions/class-10-mathematics";
import { class10ScienceQuestions } from "../prisma/practice-questions/class-10-science";
import { class11ChemistryQuestions } from "../prisma/practice-questions/class-11-chemistry";
import { class11MathematicsQuestions } from "../prisma/practice-questions/class-11-mathematics";
import { class11PhysicsQuestions } from "../prisma/practice-questions/class-11-physics";
import { class12ChemistryQuestions } from "../prisma/practice-questions/class-12-chemistry";
import { class12MathematicsQuestions } from "../prisma/practice-questions/class-12-mathematics";
import { class12PhysicsQuestions } from "../prisma/practice-questions/class-12-physics";

function assertBank(bank: Array<{ chapterSlug: string; prompt: string; options: string[]; correctOption: number }>, expected: number) {
  assert.equal(bank.length, expected);
  const prompts = new Set(bank.map((question) => `${question.chapterSlug}::${question.prompt}`));
  assert.equal(prompts.size, bank.length);
  assert.ok(bank.every((question) => question.options.length === 4 && question.correctOption >= 0 && question.correctOption <= 3));
}

test("CBSE Class 10–12 banks have twenty PYQ-style MCQs in every chapter", () => {
  assertBank(class10ScienceQuestions, 260);
  assertBank(class10MathematicsQuestions, 280);
  assertBank(class11PhysicsQuestions, 280);
  assertBank(class11ChemistryQuestions, 180);
  assertBank(class11MathematicsQuestions, 280);
  assertBank(class12PhysicsQuestions, 280);
  assertBank(class12ChemistryQuestions, 200);
  assertBank(class12MathematicsQuestions, 260);
});
