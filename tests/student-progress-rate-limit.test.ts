import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { handleProgressPost } from "@/app/api/student/resources/progress/route";
import type { RateLimitAdapter, RateLimitDecision, RateLimitPolicy } from "@/lib/rate-limit";

const student = { id: "student-1", roles: ["STUDENT"] };
const allowed: RateLimitDecision = { allowed: true, limit: 30, remaining: 29, retryAfterSeconds: 0 };
const limited: RateLimitDecision = { allowed: false, limit: 30, remaining: 0, retryAfterSeconds: 42, reason: "limited" };

function request() {
  return new Request("https://virtual.test/api/student/resources/progress", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ resourceId: "resource-1", page: 2, percent: 20, completed: false }),
  });
}

function limiter(decision: (policy: RateLimitPolicy) => RateLimitDecision): RateLimitAdapter {
  return { check: async (policy) => decision(policy), reset: async () => undefined };
}

test("progress applies user and user-resource limits before saving", async () => {
  const policies: RateLimitPolicy[] = [];
  let saved = false;
  const response = await handleProgressPost(request(), {
    getCurrentUser: async () => student,
    rateLimit: { check: async (policy) => { policies.push(policy); return allowed; }, reset: async () => undefined },
    saveProgress: async () => { saved = true; return { ok: true, progress: { page: 2, percent: 20, completed: false } } as never; },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(policies, ["progress-user", "progress-resource"]);
  assert.equal(saved, true);
});

test("either progress limit returns a private 429 before mutation", async () => {
  for (const blockedPolicy of ["progress-user", "progress-resource"] as const) {
    let saved = false;
    const response = await handleProgressPost(request(), {
      getCurrentUser: async () => student,
      rateLimit: limiter((policy) => policy === blockedPolicy ? limited : allowed),
      saveProgress: async () => { saved = true; return {} as never; },
    });
    assert.equal(response.status, 429, blockedPolicy);
    assert.equal(response.headers.get("retry-after"), "42");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(saved, false);
  }
});

test("progress limiter backend failures fail open", async () => {
  let saved = false;
  const response = await handleProgressPost(request(), {
    getCurrentUser: async () => student,
    rateLimit: { check: async () => { throw new Error("unavailable"); }, reset: async () => undefined },
    saveProgress: async () => { saved = true; return { ok: true } as never; },
  });
  assert.equal(response.status, 200);
  assert.equal(saved, true);
});

test("progress GET remains outside rate-limit enforcement", async () => {
  const source = await readFile("app/api/student/resources/progress/route.ts", "utf8");
  const getSource = source.slice(source.indexOf("export async function GET"), source.indexOf("export async function handleProgressPost"));
  assert.doesNotMatch(getSource, /getRateLimitAdapter|\.check\("progress-/);
  assert.match(getSource, /getStudentResourceProgress/);
});
