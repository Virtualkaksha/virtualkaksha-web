import assert from "node:assert/strict";
import test from "node:test";

import "./helpers/server-only";

import type { RoleName, UserStatus } from "@/app/generated/prisma/enums";
import {
  createCurrentIdentityRequestContext,
  resolveCurrentIdentityClaims,
} from "@/lib/auth/current-identity";
import {
  currentIdentitySelect,
  type CurrentIdentityRecord,
} from "@/repositories/current-identity.repository";

function session(sessionVersion: unknown = 1, roles: unknown = ["ADMIN"]) {
  return { user: { id: "opaque-user", sessionVersion, roles } };
}

function record(
  status: UserStatus = "ACTIVE",
  sessionVersion = 1,
  roles: RoleName[] = ["STUDENT"],
): CurrentIdentityRecord {
  return {
    id: "opaque-user",
    status,
    sessionVersion,
    roles: roles.map((name) => ({ role: { name } })),
  };
}

test("matching ACTIVE identity succeeds with database roles overriding JWT hints", async () => {
  const result = await resolveCurrentIdentityClaims({
    getSession: async () => session(1, ["ADMIN"]),
    findIdentity: async () => record("ACTIVE", 1, ["STUDENT"]),
  });
  assert.deepEqual(result, {
    ok: true,
    identity: { id: "opaque-user", roles: ["STUDENT"], sessionVersion: 1 },
  });
});

test("missing, zero, negative, fractional and non-numeric token versions fail closed", async () => {
  const missing = await resolveCurrentIdentityClaims({
    getSession: async () => ({ user: { id: "opaque-user", roles: ["ADMIN"] } }),
    findIdentity: async () => record(),
  });
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.code, "STALE_SESSION");

  for (const version of [0, -1, 1.5, "1", Number.NaN]) {
    let queried = false;
    const result = await resolveCurrentIdentityClaims({
      getSession: async () => session(version),
      findIdentity: async () => {
        queried = true;
        return record();
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "STALE_SESSION");
    assert.equal(queried, false);
  }
});

test("PENDING, SUSPENDED and DELETED users are rejected", async () => {
  for (const status of ["PENDING", "SUSPENDED", "DELETED"] as const) {
    const result = await resolveCurrentIdentityClaims({
      getSession: async () => session(),
      findIdentity: async () => record(status),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "INACTIVE_ACCOUNT");
  }
});

test("database failures return a sanitized IDENTITY_UNAVAILABLE result", async () => {
  const result = await resolveCurrentIdentityClaims({
    getSession: async () => session(),
    findIdentity: async () => {
      throw new Error("postgres://secret@database/internal opaque-user ADMIN");
    },
  });
  assert.deepEqual(result, {
    ok: false,
    code: "IDENTITY_UNAVAILABLE",
    message: "Authentication is temporarily unavailable.",
  });
  assert.doesNotMatch(JSON.stringify(result), /secret|postgres|database|opaque-user|ADMIN/i);
});

test("repository select is minimal and excludes credentials and profile data", () => {
  assert.deepEqual(currentIdentitySelect, {
    id: true,
    status: true,
    sessionVersion: true,
    roles: { select: { role: { select: { name: true } } } },
  });
  assert.doesNotMatch(
    JSON.stringify(currentIdentitySelect),
    /email|phone|password|token|profile|createdAt|updatedAt/i,
  );
});

test("one explicit request context deduplicates lookup", async () => {
  let lookups = 0;
  const context = createCurrentIdentityRequestContext({
    getSession: async () => session(),
    findIdentity: async () => {
      lookups += 1;
      return record();
    },
  });
  const [first, second] = await Promise.all([context.resolve(), context.resolve()]);
  assert.equal(lookups, 1);
  assert.strictEqual(first, second);
});

test("separate request contexts always perform fresh lookups", async () => {
  let lookups = 0;
  const dependencies = {
    getSession: async () => session(),
    findIdentity: async () => {
      lookups += 1;
      return record();
    },
  };
  await createCurrentIdentityRequestContext(dependencies).resolve();
  await createCurrentIdentityRequestContext(dependencies).resolve();
  assert.equal(lookups, 2);
});
