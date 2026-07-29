import test from "node:test";
import assert from "node:assert/strict";

import { STUDENT_READABLE_RESOURCE_WHERE } from "@/lib/resources/resource-access-policy";
import { mapStudentLearningResource } from "@/lib/resources/student-learning";
import {
  buildContinueLearningPageArguments,
  buildContinueLearningWhere,
  parseStudentLearningQuery,
  resolveStudentResumeHref,
} from "@/lib/resources/student-learning-query";

function resource(overrides: Record<string, unknown> = {}) {
  return {
    id: "resource-1",
    title: "Physics notes",
    slug: "physics-notes",
    description: null,
    format: "PDF",
    externalUrl: null,
    thumbnailUrl: null,
    durationSeconds: null,
    pageCount: 20,
    resourceType: { name: "Notes", code: "NOTES", iconName: null },
    assets: [{ id: "asset-1", status: "READY", isPrimary: true }],
    chapter: {
      name: "Motion",
      slug: "motion",
      boardClassSubject: {
        board: { shortName: "CBSE", slug: "cbse" },
        classLevel: { name: "Class 9", slug: "class-9" },
        subject: { name: "Physics", slug: "physics" },
      },
    },
    examTopic: null,
    ...overrides,
  };
}

test("Continue Learning predicate is student-scoped, accessible, and excludes null access timestamps", () => {
  const where = buildContinueLearningWhere("profile-1", STUDENT_READABLE_RESOURCE_WHERE);
  assert.equal(where.studentProfileId, "profile-1");
  assert.deepEqual(where.lastAccessedAt, { not: null });
  const serialized = JSON.stringify(where);
  assert.match(serialized, /PUBLISHED/);
  assert.match(serialized, /FREE/);
  assert.match(serialized, /isActive/);
});

test("Continue Learning pagination is strict, clamped, stable, and count/rows match", () => {
  assert.equal(parseStudentLearningQuery({ page: "3bad" }).page, 1);
  assert.equal(parseStudentLearningQuery({ page: "10001" }).page, 10_000);
  const args = buildContinueLearningPageArguments("profile-1", STUDENT_READABLE_RESOURCE_WHERE, { page: 50, pageSize: 12 }, 13);
  assert.deepEqual(args.count.where, args.rows.where);
  assert.equal(args.pagination.page, 2);
  assert.equal(args.rows.skip, 12);
  assert.deepEqual(args.rows.orderBy, [{ lastAccessedAt: "desc" }, { updatedAt: "desc" }, { id: "asc" }]);
});

test("board resources resume through the existing detail viewer", () => {
  const href = resolveStudentResumeHref({ ...resource(), hasReadyPrimaryAsset: true, lastPosition: 7 });
  assert.equal(href, "/student/resources/cbse/class-9/physics/motion/physics-notes");
});

test("native exam PDFs use only the protected asset endpoint", () => {
  const href = resolveStudentResumeHref({ ...resource({ chapter: null }), hasReadyPrimaryAsset: true, lastPosition: 7 });
  assert.equal(href, "/api/student/resources/resource-1/asset#page=7");
  assert.doesNotMatch(href, /objectKey|storage|filesystem/i);
});

test("legitimate external resources use HTTP(S) externalUrl and unsafe URLs are rejected", () => {
  const external = resolveStudentResumeHref({ ...resource({ chapter: null, format: "VIDEO", externalUrl: "https://video.example/lesson" }), hasReadyPrimaryAsset: false });
  const unsafe = resolveStudentResumeHref({ ...resource({ chapter: null, externalUrl: "file:///private/resource.pdf" }), hasReadyPrimaryAsset: false });
  assert.equal(external, "https://video.example/lesson");
  assert.equal(unsafe, "#");
});

test("progress view model maps page, percentage, status, context, and safe link", () => {
  const lastAccessedAt = new Date("2026-07-30T10:00:00.000Z");
  const item = mapStudentLearningResource(resource() as never, {
    status: "COMPLETED",
    progressPercent: 120,
    lastPosition: 20,
    lastAccessedAt,
  });
  assert.equal(item.progress?.status, "COMPLETED");
  assert.equal(item.progress?.percent, 100);
  assert.equal(item.progress?.lastPosition, 20);
  assert.equal(item.progress?.lastAccessedAt, lastAccessedAt);
  assert.match(item.academicLabel, /Physics.*Motion/);
  assert.doesNotMatch(JSON.stringify(item), /objectKey|provider|contentUrl|filesystem/i);
});

test("dashboard query contract limits Continue Learning to six without write operations", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("repositories/student-learning.repository.ts", "utf8"));
  assert.match(source, /findStudentContinueLearningDashboard/);
  assert.match(source, /take\s*=\s*6/);
  assert.doesNotMatch(source, /studentResourceProgress\.(update|upsert|create)/);
});
