import assert from "node:assert/strict";
import test from "node:test";

import { class12ChemistryQuestions } from "../prisma/practice-questions/class-12-chemistry";
import { class12MathematicsQuestions } from "../prisma/practice-questions/class-12-mathematics";
import { class12PhysicsQuestions } from "../prisma/practice-questions/class-12-physics";

test("CBSE Class 12 banks have twenty PYQ-style MCQs in every chapter", () => {
  assert.equal(class12PhysicsQuestions.length, 280);
  assert.equal(class12ChemistryQuestions.length, 200);
  assert.equal(class12MathematicsQuestions.length, 260);

  for (const bank of [class12PhysicsQuestions, class12ChemistryQuestions, class12MathematicsQuestions]) {
    const prompts = new Set(bank.map((question) => `${question.chapterSlug}::${question.prompt}`));
    assert.equal(prompts.size, bank.length);
    assert.ok(bank.every((question) => question.options.length === 4 && question.correctOption >= 0 && question.correctOption <= 3));
  }
});
