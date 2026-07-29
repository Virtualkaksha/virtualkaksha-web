import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSearchPageArguments,
  buildTeacherDashboardWhere,
  buildTeacherResourceWhere,
  parseTeacherSearchQuery,
} from "@/lib/resources/resource-search-query";

test("teacher predicate keeps creator ownership inside the first AND clause", () => {
  const query = parseTeacherSearchQuery({ q: "motion", status: "DRAFT" });
  const where = buildTeacherResourceWhere("teacher-1", query);
  const and = where.AND as Array<Record<string, unknown>>;
  assert.ok(Array.isArray(and));
  assert.deepEqual(and[0], { createdByUserId: "teacher-1" });
  assert.equal("OR" in and[1], false);
  assert.match(JSON.stringify(and.slice(1)), /motion/);
});

test("ownership scope cannot match an unrelated teacher id", () => {
  const serialized = JSON.stringify(buildTeacherResourceWhere("teacher-1", parseTeacherSearchQuery({})));
  assert.match(serialized, /teacher-1/);
  assert.doesNotMatch(serialized, /teacher-2/);
  assert.match(serialized, /createdByUserId/);
  assert.doesNotMatch(serialized, /teacherProfile|teachers/);
});

test("all supported teacher status filters are accepted", () => {
  for (const status of ["ALL", "DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "ARCHIVED"]) {
    assert.equal(parseTeacherSearchQuery({ status }).status, status);
  }
  assert.equal(parseTeacherSearchQuery({ status: "PRIVATE" }).status, "ALL");
});

test("archived resources are available only for ARCHIVED or ALL", () => {
  const draft = JSON.stringify(buildTeacherResourceWhere("teacher-1", parseTeacherSearchQuery({ status: "DRAFT" })));
  const archived = JSON.stringify(buildTeacherResourceWhere("teacher-1", parseTeacherSearchQuery({ status: "ARCHIVED" })));
  const all = JSON.stringify(buildTeacherResourceWhere("teacher-1", parseTeacherSearchQuery({ status: "ALL" })));
  assert.match(draft, /"status":"DRAFT"/);
  assert.match(archived, /"status":"ARCHIVED"/);
  assert.doesNotMatch(archived, /"not":"ARCHIVED"/);
  assert.doesNotMatch(all, /"not":"ARCHIVED"/);
});

test("teacher dashboard summaries exclude archived resources", () => {
  const serialized = JSON.stringify(buildTeacherDashboardWhere("teacher-1"));
  assert.match(serialized, /teacher-1/);
  assert.match(serialized, /"status":\{"not":"ARCHIVED"\}/);
});

test("teacher search ALL still includes archived resources", () => {
  const serialized = JSON.stringify(buildTeacherResourceWhere("teacher-1", parseTeacherSearchQuery({ status: "ALL" })));
  assert.doesNotMatch(serialized, /"not":"ARCHIVED"/);
  assert.doesNotMatch(serialized, /"status":"ARCHIVED"/);
});

test("teacher academic and text filters remain ANDed with ownership", () => {
  const query = parseTeacherSearchQuery({ q: "Newton", trackType: "BOARD", track: "cbse", level: "class-9", subject: "science", chapter: "force", type: "notes" });
  const where = buildTeacherResourceWhere("teacher-1", query);
  const and = where.AND as unknown[];
  assert.ok(and.length >= 5);
  const serialized = JSON.stringify(and.slice(1));
  for (const value of ["Newton", "cbse", "class-9", "science", "force", "notes"]) assert.match(serialized, new RegExp(value));
});

test("teacher pagination count and rows share ownership-scoped predicate", () => {
  const query = parseTeacherSearchQuery({ page: "3", status: "ALL" });
  const where = buildTeacherResourceWhere("teacher-1", query);
  const args = buildSearchPageArguments(where, query);
  assert.equal(args.count.where, args.rows.where);
  assert.match(JSON.stringify(args.count.where), /teacher-1/);
  assert.equal(args.rows.skip, 24);
  assert.equal(args.rows.take, 12);
});
