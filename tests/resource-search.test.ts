import test from "node:test";
import assert from "node:assert/strict";

import {
  buildResourceOrderBy,
  buildResourceSearchUrl,
  buildClampedSearchPageArguments,
  buildSearchPageArguments,
  buildSearchPagination,
  buildStudentResourceWhere,
  getAcademicUnitOptions,
  parseStudentSearchQuery,
  resolveResourceSearchHref,
} from "@/lib/resources/resource-search-query";

test("student query parsing trims and caps q", () => {
  const query = parseStudentSearchQuery({ q: `  ${"x".repeat(150)}  ` });
  assert.equal(query.q.length, 100);
  assert.equal(query.q, "x".repeat(100));
});

test("student query parsing clamps page and pageSize", () => {
  assert.equal(parseStudentSearchQuery({ page: "0", pageSize: "999" }).page, 1);
  assert.equal(parseStudentSearchQuery({ page: "bad", pageSize: "bad" }).pageSize, 12);
  assert.equal(parseStudentSearchQuery({ page: "3", pageSize: "999" }).pageSize, 48);
});

test("student query parsing rejects malformed pages and bounds large pages", () => {
  assert.equal(parseStudentSearchQuery({ page: "2junk" }).page, 1);
  assert.equal(parseStudentSearchQuery({ page: "1000000000" }).page, 10_000);
  assert.equal(parseStudentSearchQuery({ pageSize: "24junk" }).pageSize, 12);
});

test("invalid enum, track type, sort and access values are ignored safely", () => {
  const query = parseStudentSearchQuery({ sort: "popular", trackType: "course", access: "PREMIUM" });
  assert.equal(query.sort, "relevance");
  assert.equal(query.trackType, null);
  assert.equal(query.access, "FREE");
});

test("pagination URL preserves valid filters", () => {
  const query = parseStudentSearchQuery({ q: "motion", track: "cbse", trackType: "BOARD", level: "class-9", subject: "science", chapter: "force", type: "notes", sort: "newest", pageSize: "24" });
  const url = buildResourceSearchUrl("/student/resources/search", query, 2);
  const parsed = new URL(url, "https://example.test");
  assert.equal(parsed.searchParams.get("q"), "motion");
  assert.equal(parsed.searchParams.get("trackType"), "BOARD");
  assert.equal(parsed.searchParams.get("track"), "cbse");
  assert.equal(parsed.searchParams.get("level"), "class-9");
  assert.equal(parsed.searchParams.get("subject"), "science");
  assert.equal(parsed.searchParams.get("chapter"), "force");
  assert.equal(parsed.searchParams.get("type"), "notes");
  assert.equal(parsed.searchParams.get("access"), "FREE");
  assert.equal(parsed.searchParams.get("sort"), "newest");
  assert.equal(parsed.searchParams.get("page"), "2");
  assert.equal(parsed.searchParams.get("pageSize"), "24");
});

test("student predicate always enforces PUBLISHED, FREE and active catalogue relations", () => {
  const where = buildStudentResourceWhere(parseStudentSearchQuery({}));
  const serialized = JSON.stringify(where);
  assert.match(serialized, /"status":"PUBLISHED"/);
  assert.match(serialized, /"access":"FREE"/);
  assert.match(serialized, /"isActive":true/);
});

test("student text predicate searches all required fields case-insensitively", () => {
  const where = buildStudentResourceWhere(parseStudentSearchQuery({ q: "Newton" }));
  const serialized = JSON.stringify(where);
  for (const field of ["title", "titleHindi", "description", "chapter", "subject", "displayName", "firstName", "lastName"]) {
    assert.match(serialized, new RegExp(`"${field}"`));
  }
  assert.match(serialized, /"contains":"Newton","mode":"insensitive"/);
  assert.doesNotMatch(serialized, /textContent/);
});

test("school academic filters include board, level, subject, chapter and type", () => {
  const where = buildStudentResourceWhere(parseStudentSearchQuery({ trackType: "BOARD", track: "cbse", level: "class-10", subject: "science", chapter: "light", type: "notes" }));
  const serialized = JSON.stringify(where);
  for (const value of ["cbse", "class-10", "science", "light", "notes"]) assert.match(serialized, new RegExp(value));
  assert.match(serialized, /boardClassSubject/);
});

test("exam filters use exam topic and exam subject relations", () => {
  const where = buildStudentResourceWhere(parseStudentSearchQuery({ trackType: "EXAM", track: "jee", subject: "physics", chapter: "mechanics" }));
  const serialized = JSON.stringify(where);
  assert.match(serialized, /examTopic/);
  assert.match(serialized, /examSubject/);
  assert.match(serialized, /jee/);
  assert.match(serialized, /mechanics/);
});

test("track without trackType does not silently guess a catalogue", () => {
  const where = buildStudentResourceWhere(parseStudentSearchQuery({ track: "shared-slug" }));
  assert.match(JSON.stringify(where), /__ambiguous_track_requires_track_type__/);
});

test("all sort modes use stable id tie-breaking", () => {
  assert.deepEqual(buildResourceOrderBy("relevance"), [{ isFeatured: "desc" }, { sortOrder: "asc" }, { publishedAt: "desc" }, { id: "asc" }]);
  assert.deepEqual(buildResourceOrderBy("newest"), [{ publishedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }]);
  assert.deepEqual(buildResourceOrderBy("alphabetical"), [{ title: "asc" }, { id: "asc" }]);
});

test("count and rows share the exact predicate and pagination is stable", () => {
  const query = parseStudentSearchQuery({ page: "2", pageSize: "12" });
  const where = buildStudentResourceWhere(query);
  const args = buildSearchPageArguments(where, query);
  assert.equal(args.count.where, args.rows.where);
  assert.equal(args.rows.skip, 12);
  assert.equal(args.rows.take, 12);
});

test("empty results produce a valid first page", () => {
  assert.deepEqual(buildSearchPagination(0, 5, 12), { total: 0, totalPages: 1, page: 1, pageSize: 12 });
});

test("out-of-range pages fetch rows using the clamped final-page offset", () => {
  const query = parseStudentSearchQuery({ page: "999", pageSize: "12" });
  const where = buildStudentResourceWhere(query);
  const args = buildClampedSearchPageArguments(where, query, 25);
  assert.equal(args.pagination.page, 3);
  assert.equal(args.rows.skip, 24);
  assert.equal(args.rows.take, 12);
});

test("READY native PDFs open the application detail viewer", () => {
  assert.equal(resolveResourceSearchHref({ id: "res-1", format: "PDF", externalUrl: "https://example.com/fallback.pdf", hasReadyPrimaryAsset: true, detailUrl: "/student/resources/cbse/class-9/science/force/file" }), "/student/resources/cbse/class-9/science/force/file");
  assert.equal(resolveResourceSearchHref({ id: "res-1", format: "PDF", externalUrl: null, hasReadyPrimaryAsset: true }), "#");
});

test("not-ready native PDFs never fall back to legacy contentUrl", () => {
  for (const status of ["FAILED", "DELETED", "UPLOADING"]) {
    assert.equal(resolveResourceSearchHref({ id: `res-${status}`, format: "PDF", externalUrl: null, hasReadyPrimaryAsset: false }), "#");
  }
});

test("external PDFs use only a legitimate externalUrl", () => {
  assert.equal(resolveResourceSearchHref({ id: "external", format: "PDF", externalUrl: "https://cdn.example.com/file.pdf", hasReadyPrimaryAsset: false }), "https://cdn.example.com/file.pdf");
  assert.equal(resolveResourceSearchHref({ id: "missing", format: "PDF", externalUrl: null, hasReadyPrimaryAsset: false }), "#");
});

test("exam-topic facets are offered only for the selected exam context", () => {
  const facets = {
    chapters: [{ name: "Force", slug: "force" }],
    examTopics: [
      { name: "Mechanics", slug: "mechanics", examSubject: { exam: { slug: "jee" }, subject: { name: "Physics", slug: "physics" } } },
      { name: "Genetics", slug: "genetics", examSubject: { exam: { slug: "neet" }, subject: { name: "Biology", slug: "biology" } } },
    ],
  };
  const exam = getAcademicUnitOptions(parseStudentSearchQuery({ trackType: "EXAM", track: "jee", subject: "physics" }), facets);
  const board = getAcademicUnitOptions(parseStudentSearchQuery({ trackType: "BOARD" }), facets);
  assert.equal(exam.label, "Topic");
  assert.deepEqual(exam.options.map((item) => item.slug), ["mechanics"]);
  assert.equal(board.label, "Chapter");
  assert.deepEqual(board.options.map((item) => item.slug), ["force"]);
});
