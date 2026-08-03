import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { getAuthenticatedRouteRedirect, getRoleHome, resolvePostLoginRedirect } from "@/lib/auth/role-routing";

test("login UI is shared and role-neutral while signup remains student-only", async () => {
  const page = await readFile("app/(auth)/login/page.tsx", "utf8");
  const form = await readFile("app/components/auth/LoginForm.tsx", "utf8");
  assert.match(page, /VirtualKaksha account/);
  assert.match(page, /secure workspace/);
  assert.doesNotMatch(page, /Student account|student account/);
  assert.match(form, /placeholder="you@example\.com"/);
  assert.doesNotMatch(form, /name="role"|student@example\.com/);
  assert.match(form, /Create a student account/);
});

test("successful login destinations come directly from authenticated roles", () => {
  assert.equal(resolvePostLoginRedirect(["ADMIN"]), "/admin");
  assert.equal(resolvePostLoginRedirect(["TEACHER"]), "/teacher");
  assert.equal(resolvePostLoginRedirect(["STUDENT"]), "/student");
});

test("authorized callbacks are preserved and unauthorized callbacks fall back home", () => {
  assert.equal(resolvePostLoginRedirect(["ADMIN"], "/teacher/resources?page=2"), "/teacher/resources?page=2");
  assert.equal(resolvePostLoginRedirect(["TEACHER"], "/teacher/resources#drafts"), "/teacher/resources#drafts");
  assert.equal(resolvePostLoginRedirect(["STUDENT"], "/student/bookmarks"), "/student/bookmarks");
  assert.equal(resolvePostLoginRedirect(["STUDENT"], "/admin"), "/student");
  assert.equal(resolvePostLoginRedirect(["TEACHER"], "/student"), "/teacher");
  assert.equal(resolvePostLoginRedirect(["ADMIN"], "/student"), "/admin");
});

test("external, malformed and auth-page callbacks are rejected", () => {
  assert.equal(resolvePostLoginRedirect(["ADMIN"], "https://evil.test/admin", "https://virtual.test"), "/admin");
  assert.equal(resolvePostLoginRedirect(["TEACHER"], "not a url", "https://virtual.test"), "/teacher");
  assert.equal(resolvePostLoginRedirect(["STUDENT"], "//evil.test/student", "https://virtual.test"), "/student");
  assert.equal(resolvePostLoginRedirect(["STUDENT"], "/login"), "/student");
  assert.equal(resolvePostLoginRedirect(["ADMIN"], "https://virtual.test/admin/resources", "https://virtual.test"), "/admin/resources");
});

test("login authenticates before database-role routing without an intermediate student redirect", async () => {
  const action = await readFile("app/(auth)/actions.ts", "utf8");
  assert.match(action, /await signIn\("credentials", \{[\s\S]*redirect: false/);
  assert.match(action, /findAuthUserByEmail\(parsed\.data\.email\)/);
  assert.match(action, /resolvePostLoginRedirect\([\s\S]*roles/);
  assert.doesNotMatch(action.slice(action.indexOf("export async function loginAction"), action.indexOf("export async function signupAction")), /redirectTo: "\/student"/);
});

test("credentials provider still rejects invalid and inactive users and returns database roles", async () => {
  const auth = await readFile("auth.ts", "utf8");
  const service = await readFile("lib/auth/credentials-authentication.ts", "utf8");
  assert.match(auth, /authorize\(rawCredentials, request\)/);
  assert.match(auth, /authorizeCredentials\(rawCredentials, request\)/);
  assert.match(service, /user\?\.passwordHash && user\.status === "ACTIVE"/);
  assert.match(service, /DUMMY_PASSWORD_HASH/);
  assert.match(service, /roles: usableUser\.roles\.map/);
});

test("signup remains explicitly student-only", async () => {
  const repository = await readFile("repositories/auth.repository.ts", "utf8");
  const action = await readFile("app/(auth)/actions.ts", "utf8");
  assert.match(repository, /name: "STUDENT"/);
  assert.match(repository, /studentProfile:\s*\{\s*create: \{\}/);
  assert.match(action, /export async function signupAction/);
  assert.match(action, /redirect\("\/login\?signup=received"\)/);
  assert.doesNotMatch(action, /account with this email already exists/i);
  const loginPage = await readFile("app/(auth)/login/page.tsx", "utf8");
  assert.match(loginPage, /If registration could be completed, you can now sign in\./);
});

test("each authenticated role visiting login is sent to its own home", () => {
  assert.equal(getAuthenticatedRouteRedirect("/login", true, ["ADMIN"]), "/admin");
  assert.equal(getAuthenticatedRouteRedirect("/login", true, ["TEACHER"]), "/teacher");
  assert.equal(getAuthenticatedRouteRedirect("/login", true, ["STUDENT"]), "/student");
});

test("unauthenticated protected routes redirect to login", () => {
  for (const pathname of ["/admin", "/teacher/resources", "/student/bookmarks"]) {
    assert.equal(getAuthenticatedRouteRedirect(pathname, false, []), "/login");
  }
  assert.equal(getAuthenticatedRouteRedirect("/login", false, []), null);
});

test("cross-role protected access redirects to the signed-in role home", () => {
  assert.equal(getAuthenticatedRouteRedirect("/admin", true, ["STUDENT"]), "/student");
  assert.equal(getAuthenticatedRouteRedirect("/teacher", true, ["STUDENT"]), "/student");
  assert.equal(getAuthenticatedRouteRedirect("/admin", true, ["TEACHER"]), "/teacher");
  assert.equal(getAuthenticatedRouteRedirect("/student", true, ["TEACHER"]), "/teacher");
});

test("admin retains access to admin and teacher areas but not student-only routes", () => {
  assert.equal(getAuthenticatedRouteRedirect("/admin", true, ["ADMIN"]), null);
  assert.equal(getAuthenticatedRouteRedirect("/teacher", true, ["ADMIN"]), null);
  assert.equal(getAuthenticatedRouteRedirect("/student", true, ["ADMIN"]), "/admin");
});

test("role homes and route redirects cannot loop through login", () => {
  for (const roles of [["ADMIN"], ["TEACHER"], ["STUDENT"]] as const) {
    const home = getRoleHome(roles);
    assert.notEqual(home, "/login");
    assert.equal(getAuthenticatedRouteRedirect(home, true, roles), null);
  }
});

test("proxy covers all protected areas and auth pages", async () => {
  const source = await readFile("proxy.ts", "utf8");
  assert.match(source, /export default auth\(/);
  assert.match(source, /applyReportOnlyCsp/);
  assert.match(source, /source: "\/\(\(\?!api\|_next\/static\|_next\/image/);
  assert.match(source, /NextAuth\(async \(\) => createAuthRuntimeConfig\(\)\)/);
});

test("logout clears the Auth.js session and redirects to login from every navigation", async () => {
  const action = await readFile("app/(auth)/actions.ts", "utf8");
  assert.match(action, /import \{ signIn, signOut \} from "@\/auth"/);
  assert.match(action, /export async function logoutAction\(\)/);
  assert.match(action, /await signOut\(\{ redirectTo: "\/login" \}\)/);

  for (const file of [
    "app/admin/layout.tsx",
    "app/teacher/layout.tsx",
    "app/components/student/StudentSidebar.tsx",
    "app/components/student/StudentTopbar.tsx",
  ]) {
    const source = await readFile(file, "utf8");
    assert.match(source, /action=\{logoutAction\}/);
    assert.match(source, /Logout/);
  }
});

test("each protected layout has a server-side role guard", async () => {
  const admin = await readFile("app/admin/layout.tsx", "utf8");
  const teacher = await readFile("app/teacher/layout.tsx", "utf8");
  const student = await readFile("app/student/layout.tsx", "utf8");
  assert.match(admin, /await requireAdmin\(\)/);
  assert.match(teacher, /await requireTeacher\(\)/);
  assert.match(student, /await requireStudent\(\)/);
});
