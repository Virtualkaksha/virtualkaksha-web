import assert from "node:assert/strict";
import test from "node:test";

import "./helpers/server-only";

import {
  activateAccount,
  addAccountRole,
  changeOwnPasswordHash,
  logOutAllSessions,
  removeAccountRole,
  resetAccountPasswordHash,
  suspendAccount,
} from "@/lib/auth/account-security";
import { resolveCurrentIdentityClaims } from "@/lib/auth/current-identity";
import type { AccountSecurityRepository } from "@/repositories/account-security.repository";

const adminIdentity = { ok: true as const, identity: { id: "actor", roles: ["ADMIN" as const], sessionVersion: 4 } };
const userIdentity = { ok: true as const, identity: { id: "actor", roles: ["STUDENT" as const], sessionVersion: 4 } };
const allowedLimiter = { check: async () => ({ allowed: true, limit: 10, remaining: 9, retryAfterSeconds: 0 }), reset: async () => undefined };

function repository(overrides: Partial<AccountSecurityRepository> = {}) {
  let version = 10;
  const changed = async () => ({ outcome: "changed" as const, sessionVersion: ++version });
  return {
    changeRole: changed,
    replaceRoles: changed,
    changeStatus: changed,
    changePasswordHash: changed,
    incrementSessionVersion: changed,
    ...overrides,
  } as AccountSecurityRepository;
}

const adminDeps = (repo: AccountSecurityRepository) => ({ repository: repo, rateLimit: allowedLimiter, resolveAdmin: async () => adminIdentity });
const changed = (result: Awaited<ReturnType<typeof activateAccount>>) => result.ok && result.changed;

test("role changes increment once while harmless no-ops do not increment", async () => {
  let increments = 0;
  const repo = repository({
    changeRole: async (_id, _role, operation) => operation === "add"
      ? { outcome: "changed", sessionVersion: ++increments }
      : { outcome: "noop", sessionVersion: increments },
  });
  assert.deepEqual(await addAccountRole("target", "TEACHER", adminDeps(repo)), { ok: true, changed: true, message: "Account security was updated." });
  assert.deepEqual(await removeAccountRole("target", "TEACHER", adminDeps(repo)), { ok: true, changed: false, message: "No account security change was needed." });
  assert.equal(increments, 1);
});

test("status and password changes use the security repository and preserve no-op behavior", async () => {
  const operations: string[] = [];
  const repo = repository({
    changeStatus: async (_id, status) => {
      operations.push(status);
      return status === "ACTIVE" ? { outcome: "noop", sessionVersion: 4 } : { outcome: "changed", sessionVersion: 5 };
    },
    changePasswordHash: async () => {
      operations.push("password");
      return { outcome: "changed", sessionVersion: 6 };
    },
  });
  assert.equal(changed(await activateAccount("target", adminDeps(repo))), false);
  assert.equal(changed(await suspendAccount("target", adminDeps(repo))), true);
  assert.equal(changed(await resetAccountPasswordHash("target", "opaque-hash", adminDeps(repo))), true);
  assert.equal(changed(await changeOwnPasswordHash("opaque-hash-2", { repository: repo, resolveUser: async () => userIdentity })), true);
  assert.deepEqual(operations, ["ACTIVE", "SUSPENDED", "password", "password"]);
});

test("log out all requires a current active identity and increments once", async () => {
  let increments = 0;
  const repo = repository({
    incrementSessionVersion: async (id, requireActive) => {
      assert.equal(id, "actor");
      assert.equal(requireActive, true);
      return { outcome: "changed", sessionVersion: ++increments };
    },
  });
  const result = await logOutAllSessions({ repository: repo, resolveUser: async () => userIdentity });
  assert.equal(result.ok && result.changed, true);
  assert.equal(increments, 1);
});

test("admin authorization and limiter failures stop before mutation", async () => {
  let mutations = 0;
  const repo = repository({ changeRole: async () => { mutations += 1; return { outcome: "changed", sessionVersion: 2 }; } });
  const forbidden = await addAccountRole("target", "ADMIN", {
    repository: repo,
    resolveAdmin: async () => ({ ok: false, code: "FORBIDDEN", message: "raw detail" }),
  });
  assert.equal(forbidden.ok, false);
  const limited = await addAccountRole("target", "ADMIN", {
    repository: repo,
    resolveAdmin: async () => adminIdentity,
    rateLimit: { check: async () => ({ allowed: false, limit: 1, remaining: 0, retryAfterSeconds: 3, reason: "limited" }), reset: async () => undefined },
  });
  assert.equal(limited.ok, false);
  assert.equal(mutations, 0);
  assert.doesNotMatch(JSON.stringify([forbidden, limited]), /raw detail|actor|target/);
});

test("last active administrator safeguard is returned as a sanitized outcome", async () => {
  const result = await removeAccountRole("target", "ADMIN", adminDeps(repository({
    changeRole: async () => ({ outcome: "last-admin" }),
  })));
  assert.deepEqual(result, { ok: false, code: "LAST_ADMIN", message: "The final active administrator cannot be removed or disabled." });
});

test("concurrent security changes preserve every atomic increment", async () => {
  let version = 20;
  const repo = repository({
    changeRole: async () => ({ outcome: "changed", sessionVersion: ++version }),
  });
  await Promise.all([
    addAccountRole("target", "TEACHER", adminDeps(repo)),
    addAccountRole("target", "STUDENT", adminDeps(repo)),
  ]);
  assert.equal(version, 22);
});

test("every security change immediately makes the prior JWT version stale", async () => {
  let version = 7;
  const incremented = async () => ({ outcome: "changed" as const, sessionVersion: ++version });
  const repo = repository({
    changeRole: incremented,
    changeStatus: incremented,
    changePasswordHash: incremented,
    incrementSessionVersion: incremented,
  });
  const operations = [
    () => addAccountRole("target", "TEACHER", adminDeps(repo)),
    () => removeAccountRole("target", "TEACHER", adminDeps(repo)),
    () => suspendAccount("target", adminDeps(repo)),
    () => resetAccountPasswordHash("target", "new-opaque-hash", adminDeps(repo)),
    () => logOutAllSessions({ repository: repo, resolveUser: async () => userIdentity }),
  ];
  for (const operation of operations) {
    const issuedVersion = version;
    const result = await operation();
    assert.equal(result.ok && result.changed, true);
    const resolution = await resolveCurrentIdentityClaims({
      getSession: async () => ({ user: { id: "target", sessionVersion: issuedVersion } }),
      findIdentity: async () => ({ id: "target", status: "ACTIVE", sessionVersion: version, roles: [{ role: { name: "STUDENT" } }] }),
    });
    assert.deepEqual(resolution, { ok: false, code: "STALE_SESSION", message: "The session is no longer valid." });
  }
});

test("repository source keeps state and version changes transactional and atomic", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile("repositories/account-security.repository.ts", "utf8"));
  assert.match(source, /\$transaction/);
  assert.match(source, /sessionVersion:\s*\{ increment: 1 \}/);
  assert.match(source, /isolationLevel:\s*"Serializable"/);
  assert.doesNotMatch(source, /console\./);
});
