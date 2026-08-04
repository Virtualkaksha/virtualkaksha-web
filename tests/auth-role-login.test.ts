import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import "./helpers/server-only";

import { authorizeCredentials, DUMMY_PASSWORD_HASH } from "@/lib/auth/credentials-authentication";
import { executeRoleLoginAction } from "@/lib/auth/role-login-action";
import type { LoginRole } from "@/lib/auth/role-routing";
import type { RateLimitAdapter, RateLimitPolicy } from "@/lib/rate-limit";

const policies: Array<{ policy: RateLimitPolicy; identifier: string }> = [];
const limiter: RateLimitAdapter = {
  check: async (policy, identifier) => { policies.push({ policy, identifier }); return { allowed: true, limit: 20, remaining: 19, retryAfterSeconds: 0 }; },
  reset: async () => undefined,
};
const baseUser = {
  id: "user", email: "person@example.test", firstName: "Person", lastName: null, displayName: "Person", avatarUrl: null,
  passwordHash: "non-secret-fixture-hash", status: "ACTIVE", sessionVersion: 1,
};

async function authenticate(expectedRole: "STUDENT" | "TEACHER" | "ADMIN", roles: Array<"STUDENT" | "TEACHER" | "ADMIN">, passwordMatches = true) {
  policies.length = 0;
  const compared: string[] = [];
  const result = await authorizeCredentials(
    { email: "person@example.test", password: "FixturePassword1", expectedRole },
    new Request("https://virtual.test/api/auth/callback/credentials"),
    {
      rateLimit: limiter,
      resolveIp: () => ({ ok: true, address: "203.0.113.9" }),
      findUser: async () => ({ ...baseUser, roles: roles.map((name) => ({ role: { name } })) }) as never,
      comparePassword: async (_password, hash) => { compared.push(hash); return passwordMatches; },
      recordLogin: async () => undefined,
    },
  );
  return { result, compared, policies: [...policies] };
}

test("student, teacher and admin entry points require their exact database role", async () => {
  assert.ok((await authenticate("STUDENT", ["STUDENT"])).result);
  assert.ok((await authenticate("TEACHER", ["TEACHER"])).result);
  assert.ok((await authenticate("ADMIN", ["ADMIN"])).result);
  assert.equal((await authenticate("ADMIN", ["STUDENT"])).result, null);
  assert.equal((await authenticate("ADMIN", ["TEACHER"])).result, null);
  assert.equal((await authenticate("TEACHER", ["STUDENT"])).result, null);
});

test("multi-role credentials retain all roles while entry role controls acceptance", async () => {
  const roles = ["STUDENT", "TEACHER", "ADMIN"] as const;
  for (const expectedRole of roles) {
    const result = await authenticate(expectedRole, [...roles]);
    assert.deepEqual(result.result?.roles, [...roles]);
  }
});

test("wrong role and wrong password are generic and both use the real comparison", async () => {
  const wrongRole = await authenticate("ADMIN", ["STUDENT"]);
  const wrongPassword = await authenticate("STUDENT", ["STUDENT"], false);
  assert.deepEqual([wrongRole.result, wrongPassword.result], [null, null]);
  assert.deepEqual(wrongRole.compared, [baseUser.passwordHash]);
  assert.deepEqual(wrongPassword.compared, [baseUser.passwordHash]);
  assert.notEqual(wrongRole.compared[0], DUMMY_PASSWORD_HASH);
});

test("switching login roles does not change limiter identifiers", async () => {
  const snapshots = [];
  for (const role of ["STUDENT", "TEACHER", "ADMIN"] as const) snapshots.push((await authenticate(role, [role])).policies);
  assert.deepEqual(snapshots[0], snapshots[1]);
  assert.deepEqual(snapshots[1], snapshots[2]);
  assert.deepEqual(snapshots[0].map(({ policy }) => policy), ["login-ip", "login-identity", "login-email"]);
});

test("missing or invalid expected role fails closed with a dummy comparison", async () => {
  let comparedHash = "";
  const result = await authorizeCredentials(
    { email: "person@example.test", password: "FixturePassword1", expectedRole: "OWNER" },
    new Request("https://virtual.test/api/auth/callback/credentials"),
    { rateLimit: limiter, resolveIp: () => ({ ok: true, address: "203.0.113.9" }), comparePassword: async (_password, hash) => { comparedHash = hash; return false; } },
  );
  assert.equal(result, null);
  assert.equal(comparedHash, DUMMY_PASSWORD_HASH);
});

const REDIRECT = Symbol("redirect");
const AUTHENTICATION_ERROR = Symbol("authentication-error");

function loginFormData() {
  const formData = new FormData();
  formData.set("email", "test.user@example.invalid");
  formData.set("password", "not-a-real-password");
  return formData;
}

function loginActionHarness(options: { authenticationError?: boolean } = {}) {
  const calls: Array<{ provider: string; expectedRole: LoginRole }> = [];
  const redirects: string[] = [];
  const dependencies = {
    async signIn(
      provider: "credentials",
      signInOptions: {
        email: string;
        password: string;
        expectedRole: LoginRole;
        redirect: false;
      },
    ) {
      calls.push({ provider, expectedRole: signInOptions.expectedRole });
      if (options.authenticationError) throw AUTHENTICATION_ERROR;
    },
    isAuthenticationError(error: unknown) {
      return error === AUTHENTICATION_ERROR;
    },
    redirect(destination: string): never {
      redirects.push(destination);
      throw REDIRECT;
    },
  };
  return { calls, redirects, dependencies };
}

for (const [role, destination] of [
  ["STUDENT", "/student"],
  ["TEACHER", "/teacher"],
  ["ADMIN", "/admin"],
] as const) {
  test(`${role.toLowerCase()} login completes one sign-in and propagates its redirect`, async () => {
    const { calls, redirects, dependencies } = loginActionHarness();
    await assert.rejects(
      executeRoleLoginAction(role, loginFormData(), {
        callbackUrl: null,
        applicationOrigin: null,
      }, dependencies),
      (error) => error === REDIRECT,
    );
    assert.deepEqual(calls, [{ provider: "credentials", expectedRole: role }]);
    assert.deepEqual(redirects, [destination]);
  });
}

test("invalid credentials and wrong-role credentials settle with the generic state", async () => {
  for (const role of ["STUDENT", "TEACHER", "ADMIN"] as const) {
    const { calls, redirects, dependencies } = loginActionHarness({ authenticationError: true });
    const result = await executeRoleLoginAction(role, loginFormData(), {
      callbackUrl: null,
      applicationOrigin: null,
    }, dependencies);
    assert.deepEqual(result, {
      status: "error",
      message: "The email or password is incorrect.",
    });
    assert.equal(calls.length, 1);
    assert.deepEqual(redirects, []);
  }
});

test("non-authentication and redirect exceptions are not swallowed", async () => {
  const infrastructureError = new Error("sanitized infrastructure failure");
  await assert.rejects(
    executeRoleLoginAction("STUDENT", loginFormData(), {
      callbackUrl: null,
      applicationOrigin: null,
    }, {
      async signIn() {
        throw infrastructureError;
      },
      isAuthenticationError() {
        return false;
      },
      redirect(): never {
        throw REDIRECT;
      },
    }),
    infrastructureError,
  );

  const { dependencies } = loginActionHarness();
  await assert.rejects(
    executeRoleLoginAction("STUDENT", loginFormData(), {
      callbackUrl: null,
      applicationOrigin: null,
    }, dependencies),
    (error) => error === REDIRECT,
  );
});

test("multi-role student entry remains student-scoped", async () => {
  const { calls, redirects, dependencies } = loginActionHarness();
  await assert.rejects(
    executeRoleLoginAction("STUDENT", loginFormData(), {
      callbackUrl: "/admin",
      applicationOrigin: "https://virtualkaksha.test",
    }, dependencies),
    (error) => error === REDIRECT,
  );
  assert.deepEqual(calls, [{ provider: "credentials", expectedRole: "STUDENT" }]);
  assert.deepEqual(redirects, ["/student"]);
});

test("the use-server module exports only async functions and delegates once", async () => {
  const source = await readFile("app/(auth)/actions.ts", "utf8");
  const exportedFunctions = [...source.matchAll(/export\s+(async\s+)?function\s+(\w+)/g)];

  assert.ok(exportedFunctions.length > 0);
  assert.deepEqual(
    exportedFunctions.filter((match) => !match[1]).map((match) => match[2]),
    [],
  );
  for (const action of ["studentLoginAction", "teacherLoginAction", "adminLoginAction"]) {
    assert.match(source, new RegExp(`export\\s+async\\s+function\\s+${action}\\b`));
  }
  assert.doesNotMatch(source, /export\s+function\s+/);
  assert.match(source, /return executeRoleLoginAction\(/);
});
