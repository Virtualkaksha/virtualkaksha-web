import "./helpers/server-only";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { signupSchema } from "../lib/auth/validation";
import { buildStudentResourceWhere, parseStudentSearchQuery } from "../lib/resources/resource-search-query";

test("legal pages include required subjects and consistent support contact", async () => {
  const privacy = await readFile("app/privacy/page.tsx", "utf8");
  const terms = await readFile("app/terms/page.tsx", "utf8");
  const contact = await readFile("app/contact/page.tsx", "utf8");
  for (const term of ["Account", "bookmarks", "PDF reading progress", "Retention", "Security", "Children and minors", "External links", "Policy updates"]) assert.match(privacy, new RegExp(term, "i"));
  for (const term of ["Educational purpose", "Eligibility and minors", "Acceptable use", "Uploaded content", "Copyright", "Moderation", "Outcomes", "Governing law"]) assert.match(terms, new RegExp(term, "i"));
  assert.match(contact, /Noida, Uttar Pradesh, India|operatingLocation/);
  assert.match(await readFile("lib/public-site-config.ts", "utf8"), /support@virtualkaksha\.com/);
});

test("signup requires class and the interim age or guardian acknowledgement server-side", () => {
  const input = { firstName: "Test", lastName: "Student", email: "student@example.test", password: "StrongPass1", confirmPassword: "StrongPass1" };
  assert.equal(signupSchema.safeParse(input).success, false);
  assert.equal(signupSchema.safeParse({ ...input, guardianAcknowledgement: "on" }).success, false);
  const withClass = signupSchema.safeParse({ ...input, guardianAcknowledgement: "on", classLevel: "class-10" });
  assert.equal(withClass.success, true);
  const icse = signupSchema.safeParse({ ...input, guardianAcknowledgement: "on", classLevel: "class-11", board: "icse" });
  assert.equal(icse.success, true);
  if (icse.success) {
    assert.equal(icse.data.classLevel, "class-11");
    assert.equal(icse.data.board, "icse");
  }
});

test("public search normalizes invalid filters and remains published/free", () => {
  const query = parseStudentSearchQuery({ q: "x".repeat(200), page: "bad", pageSize: "99999", trackType: "invalid" });
  assert.equal(query.q.length, 100);
  assert.equal(query.page, 1);
  assert.equal(query.pageSize, 48);
  assert.equal(query.trackType, null);
  const serialized = JSON.stringify(buildStudentResourceWhere(query));
  assert.match(serialized, /PUBLISHED/);
  assert.match(serialized, /FREE/);
});

test("public search projection contains no private metadata fields", async () => {
  const source = await readFile("lib/resources/public-resource-search.ts", "utf8");
  const typeBlock = source.match(/export type PublicResourceSearchItem = \{[\s\S]*?\};/)?.[0] ?? "";
  for (const privateField of ["moderationNote", "objectKey", "bucket", "checksum", "createdByUserId", "teacherName", "externalUrl"]) {
    assert.doesNotMatch(typeBlock, new RegExp(`${privateField}\\s*:`));
  }
  assert.match(source, /openHref/);
  assert.doesNotMatch(source, /loginHref/);
});

test("public search browses class then subject then chapter before resources", async () => {
  const { parseStudentSearchQuery } = await import("../lib/resources/resource-search-query");
  const { publicBrowseHref, resolvePublicBrowseStep, withPublicBrowseDefaults } = await import("../lib/resources/public-browse");
  const empty = parseStudentSearchQuery({});
  const class10 = parseStudentSearchQuery({ level: "class-10" });
  const science = parseStudentSearchQuery({ level: "class-10", subject: "science" });
  const chapter = parseStudentSearchQuery({ level: "class-10", subject: "science", chapter: "chemical-reactions-and-equations" });
  const keyword = parseStudentSearchQuery({ q: "ncert", level: "class-10" });

  assert.equal(withPublicBrowseDefaults(empty).level, "class-10");
  assert.equal(resolvePublicBrowseStep(withPublicBrowseDefaults(empty)), "subjects");
  assert.equal(resolvePublicBrowseStep(class10), "subjects");
  assert.equal(resolvePublicBrowseStep(science), "chapters");
  assert.equal(resolvePublicBrowseStep(chapter), "resources");
  assert.equal(resolvePublicBrowseStep(keyword), "resources");

  assert.match(publicBrowseHref(empty, { level: "class-10" }), /level=class-10/);
  assert.doesNotMatch(publicBrowseHref(empty, { level: "class-10" }), /subject=/);
  assert.match(publicBrowseHref(class10, { level: "class-10", subject: "science" }), /subject=science/);
  assert.doesNotMatch(publicBrowseHref(class10, { level: "class-10", subject: "science" }), /chapter=/);

  const page = await readFile("app/search/page.tsx", "utf8");
  assert.match(page, /loadPublicCataloguePage/);
  assert.match(page, /PublicClassSwitcher/);
  assert.match(page, /PublicSubjectCards/);
  assert.match(page, /PublicChapterCards/);
  assert.doesNotMatch(page, /PublicClassCards/);
  assert.doesNotMatch(page, /facets\.subjects\.map/);
  assert.doesNotMatch(page, /All subjects/);

  const form = await readFile("components/student/ResourceSearchForm.tsx", "utf8");
  assert.doesNotMatch(form, /allowed\.add\("chemistry"\)/);
  assert.doesNotMatch(form, /allowed\.add\("physics"\)/);
});

test("class 10 catalogue subjects exclude senior-secondary only subjects", async () => {
  const seed = await readFile("prisma/seed.ts", "utf8");
  const class10 = seed.match(/10:\s*\[([\s\S]*?)\],/)?.[1] ?? "";
  assert.match(class10, /"science"/);
  assert.match(class10, /"mathematics"/);
  assert.doesNotMatch(class10, /"chemistry"/);
  assert.doesNotMatch(class10, /"physics"/);
  assert.doesNotMatch(class10, /"accountancy"/);
});

test("student class scope keeps search inside the student's class", async () => {
  const { parseStudentSearchQuery } = await import("../lib/resources/resource-search-query");
  const { applyClassScopeToSearchQuery } = await import("../lib/students/class-options");
  const scoped = applyClassScopeToSearchQuery(
    parseStudentSearchQuery({ q: "ncert", level: "class-12", track: "jee", trackType: "EXAM" }),
    { boardSlug: "cbse", classSlug: "class-10" },
  );
  assert.equal(scoped.track, "cbse");
  assert.equal(scoped.trackType, "BOARD");
  assert.equal(scoped.level, "class-10");
  assert.equal(scoped.q, "ncert");

  const form = await readFile("app/components/auth/SignupForm.tsx", "utf8");
  assert.match(form, /name="classLevel"/);
  assert.match(form, /Select your class/);
  const resources = await readFile("app/student/resources/page.tsx", "utf8");
  assert.match(resources, /getCurrentStudentClassScope/);
  assert.match(resources, /studentCatalogueHome/);
});

test("404 and global error provide safe recovery", async () => {
  const notFound = await readFile("app/not-found.tsx", "utf8");
  for (const href of ["/", "/search", "/login"]) assert.match(notFound, new RegExp(`href="${href.replace("/", "\\/")}"`));
  const globalError = await readFile("app/global-error.tsx", "utf8");
  assert.match(globalError, /retry\(\)/);
  assert.doesNotMatch(globalError, /error\.(?:message|stack|digest)|console\.(?:error|log)/);
});

test("students can update name and a small profile photo", async () => {
  const { studentProfileSchema } = await import("../lib/auth/validation");
  assert.equal(studentProfileSchema.safeParse({ firstName: "A", lastName: "" }).success, false);
  const parsed = studentProfileSchema.safeParse({ firstName: "Ajeet", lastName: "Kumar" });
  assert.equal(parsed.success, true);

  const { encodeStudentAvatar, decodeStudentAvatar, STUDENT_AVATAR_SRC } = await import("../lib/students/profile-avatar");
  const jpeg = encodeStudentAvatar(Uint8Array.of(0xff, 0xd8, 0xff, 0x00), "image/jpeg");
  assert.equal(jpeg.ok, true);
  if (jpeg.ok) {
    assert.match(jpeg.dataUrl, /^data:image\/jpeg;base64,/);
    const decoded = decodeStudentAvatar(jpeg.dataUrl);
    assert.equal(decoded.ok, true);
  }

  const jpgAlias = encodeStudentAvatar(Uint8Array.of(0xff, 0xd8, 0xff, 0x00), "image/jpg");
  assert.equal(jpgAlias.ok, true);

  const png = encodeStudentAvatar(Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d), "image/png");
  assert.equal(png.ok, true);

  const webp = new Uint8Array(12);
  webp.set([0x52, 0x49, 0x46, 0x46], 0);
  webp.set([0x57, 0x45, 0x42, 0x50], 8);
  assert.equal(encodeStudentAvatar(webp, "image/webp").ok, true);

  assert.equal(encodeStudentAvatar(Uint8Array.of(0x00, 0x01), "image/jpeg").ok, false);
  assert.equal(encodeStudentAvatar(new Uint8Array(0), "image/png").ok, false);
  assert.equal(encodeStudentAvatar(Uint8Array.of(0xff, 0xd8, 0xff), "image/png").ok, false);

  const profile = await readFile("app/student/profile/page.tsx", "utf8");
  assert.match(profile, /StudentProfileForm/);
  assert.match(profile, /STUDENT_AVATAR_SRC/);
  assert.doesNotMatch(profile, /Name and email changes are not available/);
  assert.equal(STUDENT_AVATAR_SRC, "/api/student/avatar");
  const form = await readFile("app/student/profile/StudentProfileForm.tsx", "utf8");
  assert.match(form, /name="firstName"/);
  assert.match(form, /name="lastName"/);
  assert.match(form, /name="photo"/);
  assert.match(form, /Remove photo/);
  const action = await readFile("app/student/profile/actions.ts", "utf8");
  assert.match(action, /updateStudentProfileAction/);
  assert.match(action, /encodeStudentAvatar/);
  assert.match(action, /isSameOriginAction/);
  assert.match(action, /changeStudentPasswordAction/);
  assert.match(action, /confirmClassChange/);
});

test("students can change password, confirm class switches, and see their photo in navigation", async () => {
  const { changeStudentPasswordSchema } = await import("../lib/auth/validation");
  assert.equal(changeStudentPasswordSchema.safeParse({
    currentPassword: "OldPass1",
    newPassword: "OldPass1",
    confirmPassword: "OldPass1",
  }).success, false);
  const password = changeStudentPasswordSchema.safeParse({
    currentPassword: "OldPass1",
    newPassword: "NewPass1",
    confirmPassword: "NewPass1",
  });
  assert.equal(password.success, true);

  const profile = await readFile("app/student/profile/page.tsx", "utf8");
  assert.match(profile, /StudentPasswordForm/);
  const passwordForm = await readFile("app/student/profile/StudentPasswordForm.tsx", "utf8");
  assert.match(passwordForm, /name="currentPassword"/);
  assert.match(passwordForm, /name="newPassword"/);
  assert.match(passwordForm, /name="confirmPassword"/);

  const classForm = await readFile("app/student/profile/StudentClassForm.tsx", "utf8");
  assert.match(classForm, /Yes, change class/);
  assert.match(classForm, /confirmClassChange/);

  const sidebar = await readFile("app/components/student/StudentSidebar.tsx", "utf8");
  const topbar = await readFile("app/components/student/StudentTopbar.tsx", "utf8");
  const layout = await readFile("app/student/layout.tsx", "utf8");
  assert.match(sidebar, /StudentAvatar/);
  assert.match(topbar, /StudentAvatar/);
  assert.match(layout, /getStudentNavProfile/);
});
