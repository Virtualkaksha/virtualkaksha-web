import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildSearchPageArguments,
  buildTeacherResourceWhere,
  parseTeacherSearchQuery,
} from "@/lib/resources/resource-search-query";
import {
  resolveNativePdfAssetState,
  transitionTeacherResource,
} from "@/lib/teacher/resource-management";
import {
  canTeacherEditResource,
  getTeacherResourceActions,
  getTeacherTransitionPolicy,
} from "@/lib/teacher/resource-management-policy";

test("teacher listing uses only authenticated creator ownership for count and rows", () => {
  const query = parseTeacherSearchQuery({ q: "motion", status: "DRAFT", page: "2" });
  const where = buildTeacherResourceWhere("teacher-1", query);
  const serialized = JSON.stringify(where);
  assert.match(serialized, /"createdByUserId":"teacher-1"/);
  const and = where.AND as Array<Record<string, unknown>>;
  assert.deepEqual(and[0], { createdByUserId: "teacher-1" });
  assert.equal("OR" in and[0], false);
  const args = buildSearchPageArguments(where, query);
  assert.equal(args.count.where, args.rows.where);
});

test("guessed IDs and ResourceTeacher collaborators cannot view or mutate", async () => {
  const repository = await readFile("repositories/teacher-resource.repository.ts", "utf8");
  assert.match(repository, /id: resourceId,[\s\S]*createdByUserId: userId,[\s\S]*status: \{ in:/);
  assert.doesNotMatch(repository, /teachers:\s*\{\s*some/);

  let received: Record<string, unknown> | undefined;
  const result = await transitionTeacherResource(
    { user: { id: "collaborator-1", roles: ["TEACHER"] }, resourceId: "owned-by-another", transition: "ARCHIVE" },
    async (input) => {
      received = input;
      return { count: 0 };
    },
  );
  assert.equal(received?.userId, "collaborator-1");
  assert.equal(result.ok, false);
  assert.equal(result.code, "NOT_FOUND_OR_INVALID_STATE");
});

for (const scenario of [
  { name: "DRAFT to PENDING_REVIEW", transition: "SUBMIT", from: "DRAFT", to: "PENDING_REVIEW" },
  { name: "REJECTED to PENDING_REVIEW", transition: "RESUBMIT", from: "REJECTED", to: "PENDING_REVIEW" },
  { name: "PUBLISHED to DRAFT", transition: "UNPUBLISH", from: "PUBLISHED", to: "DRAFT" },
  { name: "active resource to ARCHIVED", transition: "ARCHIVE", from: "PENDING_REVIEW", to: "ARCHIVED" },
] as const) {
  test(scenario.name, async () => {
    let update: Record<string, unknown> | undefined;
    const result = await transitionTeacherResource(
      { user: { id: "teacher-1", roles: ["TEACHER"] }, resourceId: "resource-1", transition: scenario.transition },
      async (input) => {
        update = input;
        assert.ok(input.allowedStatuses.includes(scenario.from));
        return { count: 1 };
      },
    );
    assert.equal(result.ok, true);
    assert.equal((update?.data as Record<string, unknown>).status, scenario.to);
    assert.equal((update?.data as Record<string, unknown>).publishedAt, null);
  });
}

test("resubmit clears prior moderation fields", () => {
  assert.deepEqual(getTeacherTransitionPolicy("RESUBMIT").data, {
    status: "PENDING_REVIEW",
    publishedAt: null,
    moderationNote: null,
    reviewedAt: null,
    reviewedByUserId: null,
  });
});

test("pending and archived resources cannot be edited and archived cannot mutate", () => {
  assert.equal(canTeacherEditResource("PENDING_REVIEW"), false);
  assert.equal(canTeacherEditResource("ARCHIVED"), false);
  assert.deepEqual(getTeacherResourceActions("ARCHIVED"), ["VIEW"]);
  assert.deepEqual(getTeacherResourceActions("PENDING_REVIEW"), ["VIEW", "ARCHIVE"]);
});

test("teachers have no direct publish transition", () => {
  const policySource = JSON.stringify([
    getTeacherTransitionPolicy("SUBMIT"),
    getTeacherTransitionPolicy("RESUBMIT"),
    getTeacherTransitionPolicy("UNPUBLISH"),
    getTeacherTransitionPolicy("ARCHIVE"),
  ]);
  assert.doesNotMatch(policySource, /"status":"PUBLISHED"/);
});

test("stale or invalid transitions fail when atomic update affects zero rows", async () => {
  const result = await transitionTeacherResource(
    { user: { id: "teacher-1", roles: ["TEACHER"] }, resourceId: "resource-1", transition: "SUBMIT" },
    async () => ({ count: 0 }),
  );
  assert.deepEqual(result, {
    ok: false,
    code: "NOT_FOUND_OR_INVALID_STATE",
    message: "The resource was not found or is no longer in a state that allows this action.",
  });
});

test("archive changes only resource status and preserves assets and storage", async () => {
  const repository = await readFile("repositories/teacher-resource.repository.ts", "utf8");
  const actions = await readFile("app/teacher/resources/actions.ts", "utf8");
  assert.doesNotMatch(repository, /resourceAsset\.(delete|update|updateMany)/);
  assert.doesNotMatch(actions.slice(actions.indexOf("async function transitionTeacherResourceAction")), /storage|objectKey|provider|resourceAsset/);
});

test("unauthenticated users and students are rejected before repository access", async () => {
  let calls = 0;
  const repository = async () => { calls += 1; return { count: 1 }; };
  const anonymous = await transitionTeacherResource(
    { user: { id: "", roles: [] }, resourceId: "resource-1", transition: "ARCHIVE" },
    repository,
  );
  const student = await transitionTeacherResource(
    { user: { id: "student-1", roles: ["STUDENT"] }, resourceId: "resource-1", transition: "ARCHIVE" },
    repository,
  );
  assert.equal(anonymous.ok, false);
  assert.equal(student.ok, false);
  if (anonymous.ok || student.ok) assert.fail("Unauthorized transitions must fail.");
  assert.equal(anonymous.code, "UNAUTHENTICATED");
  assert.equal(student.code, "FORBIDDEN");
  assert.equal(calls, 0);
});

test("admin moderation policy remains separate and unchanged", async () => {
  const adminActions = await readFile("app/admin/resources/actions.ts", "utf8");
  const adminPolicy = await readFile("lib/admin/resource-moderation-policy.ts", "utf8");
  assert.match(adminActions, /await requireCurrentRole\("ADMIN"\)/);
  assert.match(adminActions, /transitionAdminResource/);
  assert.match(adminPolicy, /status: "PUBLISHED"/);

  let called = false;
  const adminResult = await transitionTeacherResource(
    { user: { id: "admin-1", roles: ["ADMIN"] }, resourceId: "admin-created", transition: "ARCHIVE" },
    async () => { called = true; return { count: 1 }; },
  );
  assert.equal(called, true);
  assert.equal(adminResult.ok, true);
});

test("native PDF asset state maps READY, UPLOADING, FAILED, DELETED and MISSING", () => {
  for (const status of ["READY", "UPLOADING", "FAILED", "DELETED"] as const) {
    assert.equal(resolveNativePdfAssetState("PDF", [{ status }]), status);
  }
  assert.equal(resolveNativePdfAssetState("PDF", []), "MISSING");
  assert.equal(resolveNativePdfAssetState("PDF", [], "https://example.com/file.pdf"), null);
  assert.equal(resolveNativePdfAssetState("VIDEO", []), null);
});
