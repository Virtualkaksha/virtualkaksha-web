import assert from "node:assert/strict";
import test from "node:test";

import "./helpers/server-only";

import type { CurrentIdentity } from "@/lib/auth/current-identity";
import { handleTeacherUploadUrlRequest } from "@/app/api/teacher/resources/upload-url/route";
import type { RateLimitAdapter, RateLimitDecision, RateLimitPolicy } from "@/lib/rate-limit";
import type { PresignCapableStorageProvider } from "@/lib/resources/storage";

const teacher: CurrentIdentity = { id: "teacher-1", roles: ["TEACHER"], sessionVersion: 1 };
const allowed: RateLimitDecision = { allowed: true, limit: 10, remaining: 9, retryAfterSeconds: 0 };
const limited: RateLimitDecision = { allowed: false, limit: 3, remaining: 0, retryAfterSeconds: 27, reason: "limited" };

function request() {
  return new Request("https://virtual.test/api/teacher/resources/upload-url", { method: "POST" });
}

function adapter(decision: (policy: RateLimitPolicy) => RateLimitDecision): RateLimitAdapter {
  return { check: async (policy) => decision(policy), reset: async () => undefined };
}

function presignProvider(): PresignCapableStorageProvider {
  return {
    providerName: "s3",
    upload: async () => {
      throw new Error("upload must not run");
    },
    delete: async () => undefined,
    getReadUrl: async () => "",
    readFile: async () => Buffer.from("%PDF"),
    createUploadUrl: async ({ objectKey }) => ({
      url: "https://storage.test/put",
      objectKey,
      expiresInSeconds: 60,
      requiredContentType: "application/pdf",
    }),
    createReadUrl: async () => "",
    headObject: async () => ({ sizeBytes: 1, contentType: "application/pdf", entityTag: null }),
    readObjectPrefix: async () => Buffer.from("%PDF"),
    copyObject: async () => undefined,
  };
}

test("upload-url rejects a missing identity before storage", async () => {
  let created = false;
  const response = await handleTeacherUploadUrlRequest(request(), {
    resolveIdentity: async () => ({ ok: false, code: "NO_SESSION", message: "Authentication is required." }),
    createProvider: () => {
      created = true;
      return presignProvider();
    },
  });
  assert.equal(response.status, 401);
  assert.equal(created, false);
});

test("upload-url applies PDF limits then returns a staging PUT URL", async () => {
  const policies: RateLimitPolicy[] = [];
  const response = await handleTeacherUploadUrlRequest(request(), {
    resolveIdentity: async () => ({ ok: true, identity: teacher }),
    resolveIp: () => ({ ok: true, address: "203.0.113.10" }),
    rateLimit: { check: async (policy) => { policies.push(policy); return allowed; }, reset: async () => undefined },
    createProvider: () => presignProvider(),
    uploadMaxMb: 20,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(policies, ["pdf-upload-user", "pdf-upload-ip"]);
  const body = await response.json() as {
    ok: boolean;
    mode: string;
    url: string;
    objectKey: string;
    requiredContentType: string;
    maxBytes: number;
  };
  assert.equal(body.ok, true);
  assert.equal(body.mode, "presigned");
  assert.equal(body.url, "https://storage.test/put");
  assert.equal(body.requiredContentType, "application/pdf");
  assert.equal(body.maxBytes, 20 * 1024 * 1024);
  assert.match(body.objectKey, /^uploads\/teacher-1\/[0-9a-f-]{36}\.pdf$/);
});

test("upload-url keeps the buffered mode when storage cannot presign", async () => {
  const response = await handleTeacherUploadUrlRequest(request(), {
    resolveIdentity: async () => ({ ok: true, identity: teacher }),
    resolveIp: () => ({ ok: true, address: "203.0.113.10" }),
    rateLimit: adapter(() => allowed),
    createProvider: () => ({
      providerName: "local",
      upload: async () => {
        throw new Error("unused");
      },
      delete: async () => undefined,
      getReadUrl: async () => "",
      readFile: async () => Buffer.from("%PDF"),
    }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, mode: "buffered" });
});

test("upload-url limiter blocks with 429 before a URL is signed", async () => {
  let created = false;
  const response = await handleTeacherUploadUrlRequest(request(), {
    resolveIdentity: async () => ({ ok: true, identity: teacher }),
    resolveIp: () => ({ ok: true, address: "203.0.113.10" }),
    rateLimit: adapter(() => limited),
    createProvider: () => {
      created = true;
      return presignProvider();
    },
  });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "27");
  assert.equal(created, false);
});
