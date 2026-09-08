import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("teacher approval does not use Prisma interactive transactions", async () => {
  const repository = await readFile("repositories/teacher-access.repository.ts", "utf8");
  const action = await readFile("app/teacher-access/actions.ts", "utf8");
  const page = await readFile("app/admin/teacher-requests/page.tsx", "utf8");

  const approveFunction = repository.slice(
    repository.indexOf("export async function approveTeacherAccessRequest"),
    repository.indexOf("export async function rejectTeacherAccessRequest"),
  );

  assert.match(approveFunction, /updateMany/);
  assert.doesNotMatch(approveFunction, /\$transaction/);
  assert.match(repository, /usablePhone/);
  assert.match(repository, /P2002/);
  assert.match(repository, /phone: null/);
  assert.match(action, /error=failed/);
  assert.match(page, /Approval could not be completed/);
});
