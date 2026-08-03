import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import "./helpers/server-only";

import { authConfig } from "@/auth.config";
import { authorizeCredentials } from "@/lib/auth/credentials-authentication";
import {
  createCurrentIdentityRequestContext,
  resolveCurrentIdentityClaims,
  resolveCurrentIdentityForApi,
} from "@/lib/auth/current-identity";
import type { RateLimitAdapter } from "@/lib/rate-limit";

const allowedLimiter: RateLimitAdapter = {
  check: async () => ({ allowed: true, limit: 10, remaining: 9, retryAfterSeconds: 0 }),
  reset: async () => undefined,
};

function session(sessionVersion?: number, roles: string[] = ["ADMIN"]) {
  return { user: { id: "user-1", sessionVersion, roles } };
}

function databaseIdentity(sessionVersion = 4, roles: Array<"STUDENT" | "TEACHER" | "ADMIN"> = ["STUDENT"]) {
  return {
    id: "user-1",
    status: "ACTIVE" as const,
    sessionVersion,
    roles: roles.map((name) => ({ role: { name } })),
  };
}

test("mismatched version and missing database user revoke an existing JWT", async () => {
  const stale = await resolveCurrentIdentityClaims({
    getSession: async () => session(3),
    findIdentity: async () => databaseIdentity(4),
  });
  const missing = await resolveCurrentIdentityClaims({
    getSession: async () => session(4),
    findIdentity: async () => null,
  });
  for (const result of [stale, missing]) {
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "STALE_SESSION");
  }
});

test("old pre-migration JWT and removed ADMIN role cannot authorize ADMIN", async () => {
  const old = await resolveCurrentIdentityClaims({
    getSession: async () => session(),
    findIdentity: async () => databaseIdentity(),
  });
  assert.equal(old.ok, false);

  const downgraded = await resolveCurrentIdentityClaims({
    getSession: async () => session(4, ["ADMIN"]),
    findIdentity: async () => databaseIdentity(4, ["STUDENT"]),
  });
  assert.equal(downgraded.ok, true);
  if (downgraded.ok) {
    assert.deepEqual(downgraded.identity.roles, ["STUDENT"]);
    assert.equal(downgraded.identity.roles.includes("ADMIN"), false);
  }

  const apiResult = await resolveCurrentIdentityForApi(
    ["ADMIN"],
    createCurrentIdentityRequestContext({
      getSession: async () => session(4, ["ADMIN"]),
      findIdentity: async () => databaseIdentity(4, ["STUDENT"]),
    }),
  );
  assert.deepEqual(apiResult, { ok: false, code: "FORBIDDEN", message: "Access is denied." });
});

test("successful credentials result carries the current sessionVersion", async () => {
  const result = await authorizeCredentials(
    { email: "person@example.com", password: "Password1" },
    new Request("https://virtual.test/api/auth/callback/credentials"),
    {
      rateLimit: allowedLimiter,
      resolveIp: () => ({ ok: true, address: "203.0.113.10" }),
      findUser: async () => ({
        id: "user-1",
        email: "person@example.com",
        firstName: "Person",
        lastName: null,
        displayName: "Person",
        avatarUrl: null,
        passwordHash: "hash",
        sessionVersion: 7,
        status: "ACTIVE",
        roles: [{ role: { name: "STUDENT" } }],
      }),
      comparePassword: async () => true,
      recordLogin: async () => undefined,
    },
  );
  assert.equal(result?.sessionVersion, 7);
});

test("JWT and server session callbacks preserve sessionVersion", async () => {
  const jwtCallback = authConfig.callbacks?.jwt as unknown as (input: {
    token: Record<string, unknown>;
    user: { id: string; roles: string[]; sessionVersion: number };
  }) => Promise<Record<string, unknown>> | Record<string, unknown>;
  const token = await jwtCallback({
    token: {},
    user: { id: "user-1", roles: ["ADMIN"], sessionVersion: 9 },
  });
  assert.equal(token.sessionVersion, 9);

  const sessionCallback = authConfig.callbacks?.session as unknown as (input: {
    session: { user: { id?: string; roles?: string[]; sessionVersion?: number } };
    token: Record<string, unknown>;
  }) => Promise<{ user: { sessionVersion?: number } }> | { user: { sessionVersion?: number } };
  const currentSession = await sessionCallback({ session: { user: {} }, token });
  assert.equal(currentSession.user.sessionVersion, 9);
});

test("identity authorization has no global map, Redis or persistent Next cache", async () => {
  const source = await readFile("lib/auth/current-identity.ts", "utf8");
  assert.match(source, /cache\(/);
  assert.doesNotMatch(source, /unstable_cache|new Map|Redis|cacheTag|cacheLife/);
});
