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

test("signup requires the interim age or guardian acknowledgement server-side", () => {
  const input = { firstName: "Test", lastName: "Student", email: "student@example.test", password: "StrongPass1", confirmPassword: "StrongPass1" };
  assert.equal(signupSchema.safeParse(input).success, false);
  assert.equal(signupSchema.safeParse({ ...input, guardianAcknowledgement: "on" }).success, true);
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

test("404 and global error provide safe recovery", async () => {
  const notFound = await readFile("app/not-found.tsx", "utf8");
  for (const href of ["/", "/search", "/login"]) assert.match(notFound, new RegExp(`href="${href.replace("/", "\\/")}"`));
  const globalError = await readFile("app/global-error.tsx", "utf8");
  assert.match(globalError, /retry\(\)/);
  assert.doesNotMatch(globalError, /error\.(?:message|stack|digest)|console\.(?:error|log)/);
});
