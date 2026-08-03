import test from "node:test";
import assert from "node:assert/strict";

import "./helpers/server-only";

import { handleBookmarkMutation } from "@/app/api/student/resources/[resourceId]/bookmark/route";
import { STUDENT_READABLE_RESOURCE_WHERE } from "@/lib/resources/resource-access-policy";
import { mutateStudentBookmark, type BookmarkMutationResult } from "@/lib/resources/student-learning";
import {
  buildBookmarkPageArguments,
  parseStudentLearningQuery,
} from "@/lib/resources/student-learning-query";
import type { RateLimitAdapter, RateLimitDecision } from "@/lib/rate-limit";

const student = { id: "student-user-1", roles: ["STUDENT"] };

function bookmarkClient(options: { profile?: boolean; accessible?: boolean } = {}) {
  const saved = new Set<string>();
  let receivedWhere: unknown;
  return {
    saved,
    get receivedWhere() { return receivedWhere; },
    client: {
      studentProfile: { findUnique: async () => options.profile === false ? null : { id: "profile-1" } },
      resource: {
        findFirst: async (args: { where: unknown }) => {
          receivedWhere = args.where;
          return options.accessible === false ? null : { id: "resource-1" };
        },
      },
      resourceBookmark: {
        upsert: async () => { saved.add("profile-1:resource-1"); return {}; },
        deleteMany: async () => { saved.delete("profile-1:resource-1"); return { count: 1 }; },
      },
    },
  };
}

test("bookmark route returns 401 for unauthenticated users without Origin", async () => {
  const request = new Request("https://virtual.test/api/student/resources/resource-1/bookmark", { method: "PUT" });
  const response = await handleBookmarkMutation(request, "resource-1", true, {
    getCurrentUser: async () => null,
  });
  assert.equal(response.status, 401);
});

test("bookmark route returns 401 for unauthenticated users with invalid Origin", async () => {
  const request = new Request("https://virtual.test/api/student/resources/resource-1/bookmark", { method: "PUT", headers: { origin: "not-a-url" } });
  const response = await handleBookmarkMutation(request, "resource-1", true, { getCurrentUser: async () => null });
  assert.equal(response.status, 401);
});

test("bookmark route rejects authenticated cross-origin mutations", async () => {
  const request = new Request("https://virtual.test/api/student/resources/resource-1/bookmark", { method: "PUT", headers: { origin: "https://evil.test" } });
  const response = await handleBookmarkMutation(request, "resource-1", true, { getCurrentUser: async () => student });
  assert.equal(response.status, 403);
});

test("bookmark route returns 403 for an authenticated non-student", async () => {
  const request = new Request("https://virtual.test/api/student/resources/resource-1/bookmark", { method: "PUT", headers: { origin: "https://virtual.test" } });
  const response = await handleBookmarkMutation(request, "resource-1", true, {
    getCurrentUser: async () => ({ id: "teacher-1", roles: ["TEACHER"] }),
    mutateBookmark: async () => ({ ok: false, code: "FORBIDDEN", message: "Student access is required." }),
  });
  assert.equal(response.status, 403);
});

test("bookmark route returns 404 for an inaccessible resource", async () => {
  const request = new Request("https://virtual.test/api/student/resources/private/bookmark", { method: "PUT", headers: { origin: "https://virtual.test" } });
  const response = await handleBookmarkMutation(request, "private", true, {
    getCurrentUser: async () => student,
    mutateBookmark: async () => ({ ok: false, code: "NOT_FOUND", message: "Resource not found." }),
  });
  assert.equal(response.status, 404);
});

test("non-students and missing student profiles are rejected", async () => {
  const nonStudent = await mutateStudentBookmark({ user: { id: "teacher-1", roles: ["TEACHER"] }, resourceId: "resource-1", bookmarked: true, prismaClient: bookmarkClient().client });
  const noProfile = await mutateStudentBookmark({ user: student, resourceId: "resource-1", bookmarked: true, prismaClient: bookmarkClient({ profile: false }).client });
  assert.equal(nonStudent.ok, false);
  assert.equal(nonStudent.code, "FORBIDDEN");
  assert.equal(noProfile.ok, false);
  assert.equal(noProfile.code, "FORBIDDEN");
});

test("missing, deleted, or inaccessible resources are rejected by the canonical predicate", async () => {
  for (const status of ["DRAFT", "PENDING_REVIEW", "REJECTED", "ARCHIVED"] as const) {
    const result = await mutateStudentBookmark({ user: student, resourceId: `resource-${status}`, bookmarked: true, prismaClient: bookmarkClient({ accessible: false }).client });
    assert.equal(result.ok, false, status);
    assert.equal(result.code, "NOT_FOUND");
  }
  for (const access of ["PREMIUM", "ENROLLED_ONLY"] as const) {
    const result = await mutateStudentBookmark({ user: student, resourceId: `resource-${access}`, bookmarked: true, prismaClient: bookmarkClient({ accessible: false }).client });
    assert.equal(result.ok, false, access);
  }
  const inactive = await mutateStudentBookmark({ user: student, resourceId: "inactive-academic", bookmarked: true, prismaClient: bookmarkClient({ accessible: false }).client });
  assert.equal(inactive.ok, false);
  assert.match(JSON.stringify(STUDENT_READABLE_RESOURCE_WHERE), /isActive/);
  assert.match(JSON.stringify(STUDENT_READABLE_RESOURCE_WHERE), /PUBLISHED/);
  assert.match(JSON.stringify(STUDENT_READABLE_RESOURCE_WHERE), /FREE/);
});

test("PUT and DELETE semantics are idempotent and scoped to the session profile", async () => {
  const state = bookmarkClient();
  await mutateStudentBookmark({ user: student, resourceId: "resource-1", bookmarked: true, prismaClient: state.client });
  await mutateStudentBookmark({ user: student, resourceId: "resource-1", bookmarked: true, prismaClient: state.client });
  assert.equal(state.saved.size, 1);
  assert.match(JSON.stringify(state.receivedWhere), /student-user-1|resource-1|PUBLISHED/);
  await mutateStudentBookmark({ user: student, resourceId: "resource-1", bookmarked: false, prismaClient: state.client });
  await mutateStudentBookmark({ user: student, resourceId: "resource-1", bookmarked: false, prismaClient: state.client });
  assert.equal(state.saved.size, 0);
});

test("malformed resource identifiers do not reach a broad resource query", async () => {
  const state = bookmarkClient();
  const result = await mutateStudentBookmark({ user: student, resourceId: "x".repeat(192), bookmarked: true, prismaClient: state.client });
  assert.equal(result.ok, false);
  assert.equal(state.receivedWhere, undefined);
});

test("successful PUT response exposes only resourceId and bookmarked", async () => {
  const request = new Request("https://virtual.test/api/student/resources/resource-1/bookmark", { method: "PUT", headers: { origin: "https://virtual.test" } });
  const response = await handleBookmarkMutation(request, "resource-1", true, {
    getCurrentUser: async () => student,
    mutateBookmark: async () => ({ ok: true, resourceId: "resource-1", bookmarked: true } satisfies BookmarkMutationResult),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { resourceId: "resource-1", bookmarked: true });
});

test("successful DELETE response exposes only resourceId and bookmarked", async () => {
  const request = new Request("https://virtual.test/api/student/resources/resource-1/bookmark", { method: "DELETE", headers: { origin: "https://virtual.test" } });
  const response = await handleBookmarkMutation(request, "resource-1", false, {
    getCurrentUser: async () => student,
    mutateBookmark: async ({ resourceId, bookmarked }) => ({ ok: true, resourceId, bookmarked } satisfies BookmarkMutationResult),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { resourceId: "resource-1", bookmarked: false });
});

test("bookmark mutation within its user limit preserves PUT behavior", async () => {
  let mutated = false;
  const rateLimit: RateLimitAdapter = {
    check: async () => ({ allowed: true, limit: 60, remaining: 59, retryAfterSeconds: 0 }),
    reset: async () => undefined,
  };
  const request = new Request("https://virtual.test/api/student/resources/resource-1/bookmark", { method: "PUT", headers: { origin: "https://virtual.test" } });
  const response = await handleBookmarkMutation(request, "resource-1", true, {
    getCurrentUser: async () => student,
    rateLimit,
    mutateBookmark: async () => { mutated = true; return { ok: true, resourceId: "resource-1", bookmarked: true }; },
  });
  assert.equal(response.status, 200);
  assert.equal(mutated, true);
});

test("bookmark over limit returns 429 and Retry-After before mutation", async () => {
  let mutated = false;
  const decision: RateLimitDecision = { allowed: false, limit: 60, remaining: 0, retryAfterSeconds: 17, reason: "limited" };
  const request = new Request("https://virtual.test/api/student/resources/resource-1/bookmark", { method: "DELETE", headers: { origin: "https://virtual.test" } });
  const response = await handleBookmarkMutation(request, "resource-1", false, {
    getCurrentUser: async () => student,
    rateLimit: { check: async () => decision, reset: async () => undefined },
    mutateBookmark: async () => { mutated = true; return { ok: true, resourceId: "resource-1", bookmarked: false }; },
  });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "17");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), { error: "Too many requests. Please try again later." });
  assert.equal(mutated, false);
});

test("bookmark limiter outage fails open after authorization and same-origin validation", async () => {
  let mutated = false;
  const request = new Request("https://virtual.test/api/student/resources/resource-1/bookmark", { method: "PUT", headers: { origin: "https://virtual.test" } });
  const response = await handleBookmarkMutation(request, "resource-1", true, {
    getCurrentUser: async () => student,
    rateLimit: { check: async () => { throw new Error("unavailable"); }, reset: async () => undefined },
    mutateBookmark: async () => { mutated = true; return { ok: true, resourceId: "resource-1", bookmarked: true }; },
  });
  assert.equal(response.status, 200);
  assert.equal(mutated, true);
});

test("bookmark list pagination is strict, bounded, clamped, and uses equivalent predicates", () => {
  assert.equal(parseStudentLearningQuery({ page: "2junk" }).page, 1);
  assert.equal(parseStudentLearningQuery({ page: "999999" }).page, 10_000);
  const args = buildBookmarkPageArguments("profile-1", STUDENT_READABLE_RESOURCE_WHERE, { page: 99, pageSize: 12 }, 25);
  assert.deepEqual(args.count.where, args.rows.where);
  assert.equal(args.pagination.page, 3);
  assert.equal(args.rows.skip, 24);
  assert.deepEqual(args.rows.orderBy, [{ createdAt: "desc" }, { id: "asc" }]);
  assert.match(JSON.stringify(args.rows.where), /profile-1/);
});
