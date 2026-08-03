import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import "./helpers/server-only";

test("teacher role script assigns TEACHER and never ADMIN", async () => {
  const source = await readFile("scripts/assign-teacher-role.ts", "utf8");
  assert.match(source, /changeRole\(user\.id, "TEACHER", "add"\)/);
  assert.doesNotMatch(source, /changeRole\(user\.id, "ADMIN"/);
  assert.doesNotMatch(source, /role\.upsert|role\.create/);
});

test("role scripts use the transactional security repository and require confirmation", async () => {
  for (const path of ["scripts/assign-admin-role.ts", "scripts/assign-teacher-role.ts"]) {
    const source = await readFile(path, "utf8");
    assert.match(source, /createAccountSecurityRepository/);
    assert.match(source, /--confirm/);
    assert.match(source, /import\.meta\.url === invokedPath/);
    assert.doesNotMatch(source, /console\.(log|error)\([^\n]*(email|user\.id|error)/i);
  }
});

test("role inspection is sanitized and scripts do not run unconditionally on import", async () => {
  const source = await readFile("scripts/check-user-roles.ts", "utf8");
  assert.doesNotMatch(source, /JSON\.stringify|select:\s*\{\s*email:\s*true/);
  assert.match(source, /import\.meta\.url === invokedPath/);
  assert.doesNotMatch(source, /console\.error\(error\)|console\.error\(error\.message\)/);
  await Promise.all([
    import("@/scripts/assign-admin-role"),
    import("@/scripts/assign-teacher-role"),
    import("@/scripts/check-user-roles"),
  ]);
});

test("logout all capability revokes before clearing only the current browser cookie", async () => {
  const source = await readFile("app/(auth)/actions.ts", "utf8");
  const action = source.slice(source.indexOf("export async function logoutAllSessionsAction"), source.indexOf("async function getRequestedLoginRedirect"));
  assert.ok(action.indexOf("logOutAllSessions()") < action.indexOf("signOut("));
  assert.match(action, /signOut\(\{ redirectTo: "\/login" \}\)/);
  const currentLogout = source.slice(source.indexOf("export async function logoutAction"), source.indexOf("export async function logoutAllSessionsAction"));
  assert.doesNotMatch(currentLogout, /logOutAllSessions/);
});
