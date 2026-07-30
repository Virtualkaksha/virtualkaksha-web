import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { limitAdminModeration } from "@/lib/admin/moderation-rate-limit";
import type { RateLimitAdapter, RateLimitDecision, RateLimitPolicy } from "@/lib/rate-limit";

const allowed: RateLimitDecision = { allowed: true, limit: 10, remaining: 9, retryAfterSeconds: 0 };
const limited: RateLimitDecision = { allowed: false, limit: 2, remaining: 0, retryAfterSeconds: 9, reason: "limited" };

function adapter(decision: (policy: RateLimitPolicy) => RateLimitDecision): RateLimitAdapter {
  return { check: async (policy) => decision(policy), reset: async () => undefined };
}

test("admin moderation applies user and resource-action policies", async () => {
  const policies: RateLimitPolicy[] = [];
  const result = await limitAdminModeration("admin-1", "resource-1", "APPROVE", {
    check: async (policy) => { policies.push(policy); return allowed; },
    reset: async () => undefined,
  });
  assert.deepEqual(result, { allowed: true });
  assert.deepEqual(policies, ["admin-mutation-user", "admin-resource-action"]);
});

test("admin user/action limits and backend outage fail closed with sanitized results", async () => {
  for (const action of ["APPROVE", "REJECT", "ARCHIVE"] as const) {
    for (const blockedPolicy of ["admin-mutation-user", "admin-resource-action"] as const) {
      const result = await limitAdminModeration("admin-1", "resource-1", action, adapter((policy) => policy === blockedPolicy ? limited : allowed));
      assert.deepEqual(result, { allowed: false, retryAfterSeconds: 9 });
    }
  }
  const outage = await limitAdminModeration("admin-1", "resource-1", "APPROVE", {
    check: async () => { throw new Error("redis secret admin-1 resource-1"); },
    reset: async () => undefined,
  });
  assert.deepEqual(outage, { allowed: false, retryAfterSeconds: 1 });
  assert.doesNotMatch(JSON.stringify(outage), /redis|secret|admin-1|resource-1/i);
});

test("admin actions authenticate, limit, then retain atomic updateMany transitions", async () => {
  const source = await readFile("app/admin/resources/actions.ts", "utf8");
  for (const action of ["APPROVE", "REJECT", "ARCHIVE"]) {
    assert.match(source, new RegExp(`enforceAdminMutation\\(admin\\.id, resourceId, "${action}"\\)`));
  }
  for (const functionName of ["approveResource", "rejectResource", "archiveResource"]) {
    const actionSource = source.slice(source.indexOf(`export async function ${functionName}`));
    assert.ok(actionSource.indexOf("requireAdmin()") < actionSource.indexOf("enforceAdminMutation"), functionName);
  }
  assert.match(source, /prisma\.resource\.updateMany/);
  assert.match(source, /rateLimited=true&retryAfter=/);
  const page = await readFile("app/admin/resources/[resourceId]/page.tsx", "utf8");
  assert.match(page, /Too many requests\. Please wait before trying again\./);
});

test("client components contain no Upstash or server-only configuration", async () => {
  for (const file of ["app/teacher/resources/ResourceCreateForm.tsx", "components/student/StudentPdfViewer.tsx"]) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /@upstash|UPSTASH_REDIS|RATE_LIMIT_KEY_SECRET|RATE_LIMIT_TRUSTED_PROXY/);
  }
});
