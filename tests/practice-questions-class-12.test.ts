import assert from "node:assert/strict";
import test from "node:test";

import { class10MathematicsQuestions } from "../prisma/practice-questions/class-10-mathematics";
import { class10MathematicsExtraQuestions } from "../prisma/practice-questions/class-10-mathematics-extra";
import { class10ScienceQuestions } from "../prisma/practice-questions/class-10-science";
import { class10ScienceExtraQuestions } from "../prisma/practice-questions/class-10-science-extra";
import { class6MathematicsQuestions } from "../prisma/practice-questions/class-6-mathematics";
import { class6ScienceQuestions } from "../prisma/practice-questions/class-6-science";
import { class7MathematicsQuestions } from "../prisma/practice-questions/class-7-mathematics";
import { class7ScienceQuestions } from "../prisma/practice-questions/class-7-science";
import { class8MathematicsQuestions } from "../prisma/practice-questions/class-8-mathematics";
import { class8ScienceQuestions } from "../prisma/practice-questions/class-8-science";
import { class9MathematicsQuestions } from "../prisma/practice-questions/class-9-mathematics";
import { class9ScienceQuestions } from "../prisma/practice-questions/class-9-science";
import { class11ChemistryQuestions } from "../prisma/practice-questions/class-11-chemistry";
import { class11ChemistryExtraQuestions } from "../prisma/practice-questions/class-11-chemistry-extra";
import { class11MathematicsQuestions } from "../prisma/practice-questions/class-11-mathematics";
import { class11MathematicsExtraQuestions } from "../prisma/practice-questions/class-11-mathematics-extra";
import { class11PhysicsQuestions } from "../prisma/practice-questions/class-11-physics";
import { class11PhysicsExtraQuestions } from "../prisma/practice-questions/class-11-physics-extra";
import { class12ChemistryQuestions } from "../prisma/practice-questions/class-12-chemistry";
import { class12ChemistryExtraQuestions } from "../prisma/practice-questions/class-12-chemistry-extra";
import { class12MathematicsQuestions } from "../prisma/practice-questions/class-12-mathematics";
import { class12MathematicsExtraQuestions } from "../prisma/practice-questions/class-12-mathematics-extra";
import { class12PhysicsQuestions } from "../prisma/practice-questions/class-12-physics";
import { class12PhysicsExtraQuestions } from "../prisma/practice-questions/class-12-physics-extra";

function assertBank(bank: Array<{ chapterSlug: string; prompt: string; options: string[]; correctOption: number }>, expected: number) {
  assert.equal(bank.length, expected);
  const prompts = new Set(bank.map((question) => `${question.chapterSlug}::${question.prompt}`));
  assert.equal(prompts.size, bank.length);
  assert.ok(bank.every((question) => question.options.length === 4 && question.correctOption >= 0 && question.correctOption <= 3));
}

test("CBSE Class 6–12 banks have the expected PYQ-style MCQs", () => {
  assertBank(class6ScienceQuestions, 480);
  assertBank(class6MathematicsQuestions, 420);
  assertBank(class7ScienceQuestions, 390);
  assertBank(class7MathematicsQuestions, 450);
  assertBank(class8ScienceQuestions, 390);
  assertBank(class8MathematicsQuestions, 390);
  assertBank(class9ScienceQuestions, 360);
  assertBank(class9MathematicsQuestions, 390);
  assertBank(class10ScienceQuestions, 260);
  assertBank(class10ScienceExtraQuestions, 130);
  assertBank(class10MathematicsQuestions, 280);
  assertBank(class10MathematicsExtraQuestions, 140);
  assertBank(class11PhysicsQuestions, 280);
  assertBank(class11PhysicsExtraQuestions, 140);
  assertBank(class11ChemistryQuestions, 180);
  assertBank(class11ChemistryExtraQuestions, 90);
  assertBank(class11MathematicsQuestions, 280);
  assertBank(class11MathematicsExtraQuestions, 140);
  assertBank(class12PhysicsQuestions, 280);
  assertBank(class12PhysicsExtraQuestions, 140);
  assertBank(class12ChemistryQuestions, 200);
  assertBank(class12ChemistryExtraQuestions, 100);
  assertBank(class12MathematicsQuestions, 260);
  assertBank(class12MathematicsExtraQuestions, 130);
});
