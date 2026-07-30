import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { handleNativeTeacherResourceCreation } from "@/app/api/teacher/resources/route";
import type { RateLimitAdapter, RateLimitDecision, RateLimitPolicy } from "@/lib/rate-limit";
import { authorizeTeacherMutation } from "@/lib/teacher/mutation-rate-limit";

const teacher = { id: "teacher-1", roles: ["TEACHER"] };
const allowed: RateLimitDecision = { allowed: true, limit: 10, remaining: 9, retryAfterSeconds: 0 };
const limited: RateLimitDecision = { allowed: false, limit: 3, remaining: 0, retryAfterSeconds: 27, reason: "limited" };

function request(contentLength?: string) {
  const headers = contentLength ? { "content-length": contentLength } : undefined;
  return new Request("https://virtual.test/api/teacher/resources", { method: "POST", headers });
}

function nativeForm() {
  const form = new FormData();
  form.set("format", "PDF");
  form.set("sourceType", "native-pdf");
  form.set("file", new File(["%PDF-test"], "lesson.pdf", { type: "application/pdf" }));
  return form;
}

function adapter(decision: (policy: RateLimitPolicy) => RateLimitDecision): RateLimitAdapter {
  return { check: async (policy) => decision(policy), reset: async () => undefined };
}

test("native creation authenticates and applies all user/IP limits before parsing", async () => {
  const policies: RateLimitPolicy[] = [];
  let parsed = false;
  let created = false;
  const response = await handleNativeTeacherResourceCreation(request(), {
    getCurrentUser: async () => teacher,
    resolveIp: () => ({ ok: true, address: "203.0.113.10" }),
    rateLimit: { check: async (policy) => { policies.push(policy); return allowed; }, reset: async () => undefined },
    parseFormData: async () => { parsed = true; return nativeForm(); },
    createResource: async () => { created = true; return { ok: true, message: "Resource saved and PDF uploaded successfully.", resourceId: "resource-1" }; },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(policies, ["resource-create-user", "resource-create-ip", "pdf-upload-user", "pdf-upload-ip"]);
  assert.equal(parsed, true);
  assert.equal(created, true);
});

test("each native user/IP limiter blocks with 429 before formData, storage or database", async () => {
  for (const blockedPolicy of ["resource-create-user", "resource-create-ip", "pdf-upload-user", "pdf-upload-ip"] as const) {
    let touched = false;
    const response = await handleNativeTeacherResourceCreation(request(), {
      getCurrentUser: async () => teacher,
      resolveIp: () => ({ ok: true, address: "203.0.113.10" }),
      rateLimit: adapter((policy) => policy === blockedPolicy ? limited : allowed),
      parseFormData: async () => { touched = true; return nativeForm(); },
      createResource: async () => { touched = true; return {} as never; },
    });
    assert.equal(response.status, 429, blockedPolicy);
    assert.equal(response.headers.get("retry-after"), "27");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(touched, false);
  }
});

test("native limiter outage and missing trusted IP fail closed before parsing", async () => {
  for (const options of [
    { resolveIp: () => ({ ok: false as const, code: "MISSING_IP" as const, message: "missing" }), rateLimit: adapter(() => allowed) },
    { resolveIp: () => ({ ok: true as const, address: "203.0.113.10" }), rateLimit: { check: async () => { throw new Error("secret backend error"); }, reset: async () => undefined } satisfies RateLimitAdapter },
  ]) {
    let parsed = false;
    const response = await handleNativeTeacherResourceCreation(request(), {
      getCurrentUser: async () => teacher,
      ...options,
      parseFormData: async () => { parsed = true; return nativeForm(); },
    });
    assert.equal(response.status, 503);
    assert.equal(parsed, false);
    assert.doesNotMatch(await response.text(), /secret|backend|203\.0\.113|teacher-1/i);
  }
});

test("oversized Content-Length fails before multipart parsing and native-only validation is enforced", async () => {
  let parsed = false;
  const dependencies = {
    getCurrentUser: async () => teacher,
    resolveIp: () => ({ ok: true as const, address: "203.0.113.10" }),
    rateLimit: adapter(() => allowed),
  };
  const oversized = await handleNativeTeacherResourceCreation(request(String(21 * 1024 * 1024 + 1)), {
    ...dependencies,
    parseFormData: async () => { parsed = true; return nativeForm(); },
  });
  assert.equal(oversized.status, 413);
  assert.equal(parsed, false);

  const external = nativeForm();
  external.set("sourceType", "external-url");
  const wrongFlow = await handleNativeTeacherResourceCreation(request(), { ...dependencies, parseFormData: async () => external });
  assert.equal(wrongFlow.status, 400);
});

test("teacher mutation authorization precedes both limits and repository mutation", async () => {
  const events: string[] = [];
  const limiter: RateLimitAdapter = {
    check: async (policy) => { events.push(policy); return allowed; },
    reset: async () => undefined,
  };
  const result = await authorizeTeacherMutation(teacher, "resource-1", "SUBMIT", {
    findOwned: async (_resourceId, userId) => { events.push(`owner:${userId}`); return {}; },
    rateLimit: limiter,
  });
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(events, ["owner:teacher-1", "teacher-mutation-user", "teacher-resource-action"]);

  let checked = false;
  const unauthorized = await authorizeTeacherMutation({ id: "teacher-2" }, "resource-1", "ARCHIVE", {
    findOwned: async () => null,
    rateLimit: { check: async () => { checked = true; return allowed; }, reset: async () => undefined },
  });
  assert.deepEqual(unauthorized, { ok: false, code: "NOT_FOUND" });
  assert.equal(checked, false);
});

test("teacher user/action limits and outages fail closed before atomic transitions", async () => {
  for (const blockedPolicy of ["teacher-mutation-user", "teacher-resource-action"] as const) {
    const result = await authorizeTeacherMutation(teacher, "resource-1", "RESUBMIT", {
      findOwned: async () => ({}),
      rateLimit: adapter((policy) => policy === blockedPolicy ? limited : allowed),
    });
    assert.deepEqual(result, { ok: false, code: "RATE_LIMITED", retryAfterSeconds: 27 });
  }
  const outage = await authorizeTeacherMutation(teacher, "resource-1", "UNPUBLISH", {
    findOwned: async () => ({}),
    rateLimit: { check: async () => { throw new Error("provider details"); }, reset: async () => undefined },
  });
  assert.deepEqual(outage, { ok: false, code: "RATE_LIMITED", retryAfterSeconds: 1 });
  assert.doesNotMatch(JSON.stringify(outage), /teacher-1|resource-1|provider/i);
});

test("native UI uses the dedicated route while external creation keeps the server action", async () => {
  const source = await readFile("app/teacher/resources/ResourceCreateForm.tsx", "utf8");
  assert.match(source, /isPdfNativeUpload[\s\S]*fetch\("\/api\/teacher\/resources"/);
  assert.match(source, /else \{\s*result = await action\(formData\)/);
  assert.match(source, /response\.status === 429/);
  assert.match(source, /retry-after/);
  assert.doesNotMatch(source, /@upstash|UPSTASH_REDIS|RATE_LIMIT_KEY_SECRET/);
});

