import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("student test actions require same-origin and fail closed on rate limits", async () => {
  const source = await readFile("app/student/tests/actions.ts", "utf8");
  assert.match(source, /isSameOriginAction/);
  assert.match(source, /student-test-start-user/);
  assert.match(source, /student-test-submit-user/);
  assert.match(source, /requireCurrentRole\("STUDENT"\)/);
});

test("teacher question creation reuses resource create limits", async () => {
  const source = await readFile("app/teacher/questions/actions.ts", "utf8");
  assert.match(source, /isSameOriginAction/);
  assert.match(source, /resource-create-user/);
  assert.match(source, /resource-create-ip/);
  assert.match(source, /PENDING_REVIEW/);
});

test("admin question moderation verifies origin before publishing", async () => {
  const source = await readFile("app/admin/questions/actions.ts", "utf8");
  assert.match(source, /isSameOriginAction/);
  assert.match(source, /limitAdminModeration/);
  assert.match(source, /PUBLISHED/);
});

test("practice test repository avoids interactive transactions", async () => {
  const source = await readFile("repositories/practice-test.repository.ts", "utf8");
  assert.doesNotMatch(source, /\$transaction/);
});

test("attempt pages never send the answer key to the client form", async () => {
  const source = await readFile("app/student/tests/[attemptId]/page.tsx", "utf8");
  assert.match(source, /correctOption: _correct/);
  assert.doesNotMatch(source, /items=\{attempt\.items\}/);
});
