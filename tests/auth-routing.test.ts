import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { getAuthenticatedRouteRedirect, getRoleHome, resolveRolePostLoginRedirect } from "@/lib/auth/role-routing";

test("role login pages identify their workspace and share the secured form", async () => {
  const student = await readFile("app/(auth)/login/page.tsx", "utf8");
  const teacher = await readFile("app/(auth)/teacher/login/page.tsx", "utf8");
  const admin = await readFile("app/(auth)/admin/login/page.tsx", "utf8");
  const content = await readFile("app/components/auth/RoleLoginPage.tsx", "utf8");
  const form = await readFile("app/components/auth/LoginForm.tsx", "utf8");
  assert.match(student, /role="STUDENT"/);
  assert.match(teacher, /role="TEACHER"/);
  assert.match(admin, /role="ADMIN"/);
  assert.match(content, /Student Login/);
  assert.match(content, /Teacher Login/);
  assert.match(content, /Admin Login/);
  assert.match(form, /studentLoginAction/);
  assert.match(form, /teacherLoginAction/);
  assert.match(form, /adminLoginAction/);
  assert.doesNotMatch(form, /name="role"/);
});

test("each login entry defaults to its selected workspace for multi-role accounts", () => {
  assert.equal(resolveRolePostLoginRedirect("STUDENT"), "/student");
  assert.equal(resolveRolePostLoginRedirect("TEACHER"), "/teacher");
  assert.equal(resolveRolePostLoginRedirect("ADMIN"), "/admin");
});

test("callbacks are restricted to the selected workspace", () => {
  assert.equal(resolveRolePostLoginRedirect("STUDENT", "/student/bookmarks"), "/student/bookmarks");
  assert.equal(resolveRolePostLoginRedirect("TEACHER", "/teacher/resources?status=DRAFT"), "/teacher/resources?status=DRAFT");
  assert.equal(resolveRolePostLoginRedirect("ADMIN", "/admin/resources#queue"), "/admin/resources#queue");
  assert.equal(resolveRolePostLoginRedirect("STUDENT", "/admin"), "/student");
  assert.equal(resolveRolePostLoginRedirect("TEACHER", "/student"), "/teacher");
  assert.equal(resolveRolePostLoginRedirect("ADMIN", "/teacher"), "/admin");
});

test("external, malformed and cross-workspace callbacks cannot escape", () => {
  assert.equal(resolveRolePostLoginRedirect("ADMIN", "https://evil.test/admin", "https://virtual.test"), "/admin");
  assert.equal(resolveRolePostLoginRedirect("TEACHER", "not a url", "https://virtual.test"), "/teacher");
  assert.equal(resolveRolePostLoginRedirect("STUDENT", "//evil.test/student", "https://virtual.test"), "/student");
  assert.equal(resolveRolePostLoginRedirect("ADMIN", "https://virtual.test/admin/resources", "https://virtual.test"), "/admin/resources");
});

test("server actions hard-bind roles before calling Auth.js", async () => {
  const action = await readFile("app/(auth)/actions.ts", "utf8");
  const orchestration = await readFile("lib/auth/role-login-action.ts", "utf8");
  assert.match(action, /studentLoginAction[\s\S]*loginForRoleAction\("STUDENT"/);
  assert.match(action, /teacherLoginAction[\s\S]*loginForRoleAction\("TEACHER"/);
  assert.match(action, /adminLoginAction[\s\S]*loginForRoleAction\("ADMIN"/);
  assert.match(action, /return executeRoleLoginAction\([\s\S]*expectedRole/);
  assert.match(orchestration, /await dependencies\.signIn\("credentials", \{[\s\S]*expectedRole,[\s\S]*redirect: false/);
  assert.match(orchestration, /dependencies\.redirect\(resolveRolePostLoginRedirect\([\s\S]*expectedRole/);
});

test("credentials provider enforces ACTIVE status, expected role, and session claims", async () => {
  const auth = await readFile("auth.ts", "utf8");
  const service = await readFile("lib/auth/credentials-authentication.ts", "utf8");
  assert.match(auth, /authorizeCredentials\(rawCredentials, request\)/);
  assert.match(service, /user\?\.passwordHash && user\.status === "ACTIVE"/);
  assert.match(service, /hasRequiredRole/);
  assert.match(service, /role\.name === requiredRole/);
  assert.match(service, /sessionVersion: usableUser\.sessionVersion/);
});

test("authenticated visits and protected redirects respect exact roles", () => {
  assert.equal(getAuthenticatedRouteRedirect("/login", true, ["STUDENT", "TEACHER", "ADMIN"]), "/student");
  assert.equal(getAuthenticatedRouteRedirect("/teacher/login", true, ["STUDENT", "TEACHER", "ADMIN"]), "/teacher");
  assert.equal(getAuthenticatedRouteRedirect("/admin/login", true, ["STUDENT", "TEACHER", "ADMIN"]), "/admin");
  assert.equal(getAuthenticatedRouteRedirect("/admin/login", true, ["STUDENT"]), null);
  assert.equal(getAuthenticatedRouteRedirect("/teacher/login", true, ["STUDENT"]), null);
  assert.equal(getAuthenticatedRouteRedirect("/admin", false, []), "/admin/login");
  assert.equal(getAuthenticatedRouteRedirect("/teacher", false, []), "/teacher/login");
  assert.equal(getAuthenticatedRouteRedirect("/student", false, []), "/login");
  assert.equal(getAuthenticatedRouteRedirect("/student/resources", false, []), null);
  assert.equal(getAuthenticatedRouteRedirect("/student/resources/cbse/class-10/mathematics/polynomials/notes", false, []), null);
  assert.equal(getAuthenticatedRouteRedirect("/student/bookmarks", false, []), "/login");
  assert.equal(getAuthenticatedRouteRedirect("/signup", false, []), null);
  assert.equal(getAuthenticatedRouteRedirect("/signup", true, ["ADMIN"]), null);
  assert.equal(getAuthenticatedRouteRedirect("/signup", true, ["TEACHER"]), null);
  assert.equal(getAuthenticatedRouteRedirect("/signup", true, ["STUDENT"]), "/student");
  assert.equal(getAuthenticatedRouteRedirect("/signup", true, ["ADMIN", "STUDENT"]), "/student");
  assert.equal(getAuthenticatedRouteRedirect("/teacher-access", false, []), null);
  assert.equal(getAuthenticatedRouteRedirect("/teacher-access", true, ["STUDENT"]), null);
});

test("single-role accounts cannot cross protected workspace boundaries", () => {
  assert.equal(getAuthenticatedRouteRedirect("/teacher", true, ["STUDENT"]), "/student");
  assert.equal(getAuthenticatedRouteRedirect("/admin", true, ["STUDENT"]), "/student");
  assert.equal(getAuthenticatedRouteRedirect("/student", true, ["TEACHER"]), "/teacher");
  assert.equal(getAuthenticatedRouteRedirect("/admin", true, ["TEACHER"]), "/teacher");
  assert.equal(getAuthenticatedRouteRedirect("/teacher", true, ["ADMIN"]), "/admin");
  assert.equal(getAuthenticatedRouteRedirect("/admin", true, ["ADMIN"]), null);
});

test("role homes and route redirects cannot loop", () => {
  for (const roles of [["ADMIN"], ["TEACHER"], ["STUDENT"]] as const) {
    const home = getRoleHome(roles);
    assert.equal(getAuthenticatedRouteRedirect(home, true, roles), null);
  }
});

test("public navigation exposes student and teacher entry points", async () => {
  const publicSource = `${await readFile("app/components/Navbar.tsx", "utf8")}\n${await readFile("app/components/NavbarClient.tsx", "utf8")}\n${await readFile("app/components/Footer.tsx", "utf8")}`;
  assert.match(publicSource, /href="\/login"/);
  assert.match(publicSource, /\/teacher\/login/);
  assert.match(publicSource, /\/teacher-access/);
});

test("logout and protected layouts retain server-side role guards", async () => {
  const action = await readFile("app/(auth)/actions.ts", "utf8");
  const admin = await readFile("app/admin/layout.tsx", "utf8");
  const teacher = await readFile("app/teacher/layout.tsx", "utf8");
  const student = await readFile("app/student/layout.tsx", "utf8");
  const studentHome = await readFile("app/student/page.tsx", "utf8");
  assert.match(action, /await signOut\(\{ redirectTo: "\/login" \}\)/);
  assert.match(admin, /requireCurrentRole\("ADMIN"\)/);
  assert.match(teacher, /requireAnyCurrentRole\(\["TEACHER", "ADMIN"\]\)/);
  assert.match(student, /getCurrentIdentity\(\)/);
  assert.match(studentHome, /requireCurrentRole\("STUDENT"\)/);
});
