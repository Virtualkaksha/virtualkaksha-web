import type { RateLimitAdapter, RateLimitDecision, RateLimitPolicy } from "@/lib/rate-limit";
import { getRateLimitAdapter, resolveTrustedClientIp } from "@/lib/rate-limit";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/auth/validation";

type AuthUserRecord = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  passwordHash: string | null;
  status: string;
  roles: Array<{ role: { name: "STUDENT" | "TEACHER" | "ADMIN" } }>;
} | null;

export const DUMMY_PASSWORD_HASH = "$2b$12$jRKKXMfZtxWypVqUf10yBO6cI7QEy73Mv5Ihtc89F9/fHx80GHNDS";

type CredentialsDependencies = {
  rateLimit?: RateLimitAdapter;
  resolveIp?: (request: Request) => ReturnType<typeof resolveTrustedClientIp>;
  findUser?: (email: string) => Promise<AuthUserRecord>;
  comparePassword?: (password: string, hash: string) => Promise<boolean>;
  recordLogin?: (userId: string) => Promise<unknown>;
};

function normalizedEmail(rawCredentials: unknown) {
  if (!rawCredentials || typeof rawCredentials !== "object") return "invalid-email";
  const value = (rawCredentials as Record<string, unknown>).email;
  if (typeof value !== "string") return "invalid-email";
  return value.normalize("NFKC").trim().toLowerCase().slice(0, 320) || "invalid-email";
}

function unavailable(): RateLimitDecision {
  return { allowed: false, limit: 0, remaining: 0, retryAfterSeconds: 1, reason: "backend-unavailable" };
}

async function check(
  adapter: RateLimitAdapter,
  policy: RateLimitPolicy,
  identifier: string,
) {
  return adapter.check(policy, identifier).catch(() => unavailable());
}

export async function authorizeCredentials(
  rawCredentials: unknown,
  request: Request,
  dependencies: CredentialsDependencies = {},
) {
  const email = normalizedEmail(rawCredentials);
  const password = rawCredentials && typeof rawCredentials === "object"
    && typeof (rawCredentials as Record<string, unknown>).password === "string"
    ? (rawCredentials as Record<string, string>).password
    : "";
  const ipResult = (dependencies.resolveIp ?? ((value) => resolveTrustedClientIp({ request: value })))(request);
  if (!ipResult.ok) {
    await (dependencies.comparePassword ?? verifyPassword)(password, DUMMY_PASSWORD_HASH);
    return null;
  }

  let limiter: RateLimitAdapter;
  try {
    limiter = dependencies.rateLimit ?? getRateLimitAdapter();
  } catch {
    await (dependencies.comparePassword ?? verifyPassword)(password, DUMMY_PASSWORD_HASH);
    return null;
  }

  const identity = `${ipResult.address}\u0000${email}`;
  for (const [policy, identifier] of [
    ["login-ip", ipResult.address],
    ["login-identity", identity],
    ["login-email", email],
  ] as const) {
    const decision = await check(limiter, policy, identifier);
    if (!decision.allowed) {
      await (dependencies.comparePassword ?? verifyPassword)(password, DUMMY_PASSWORD_HASH);
      return null;
    }
  }

  const parsed = loginSchema.safeParse(rawCredentials);
  const findUser = dependencies.findUser ?? (async (value: string) => {
    const repository = await import("@/repositories/auth.repository");
    return repository.findAuthUserByEmail(value);
  });
  const user = parsed.success ? await findUser(parsed.data.email) : null;
  const usableUser = user?.passwordHash && user.status === "ACTIVE" ? user : null;
  const passwordMatches = await (dependencies.comparePassword ?? verifyPassword)(
    password,
    usableUser?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );
  if (!usableUser || !passwordMatches) return null;

  try {
    await limiter.reset("login-identity", identity);
    await limiter.reset("login-email", email);
  } catch {
    return null;
  }
  const recordLogin = dependencies.recordLogin ?? (async (userId: string) => {
    const repository = await import("@/repositories/auth.repository");
    return repository.markUserLogin(userId);
  });
  await recordLogin(usableUser.id);

  return {
    id: usableUser.id,
    email: usableUser.email,
    name: usableUser.displayName ?? [usableUser.firstName, usableUser.lastName].filter(Boolean).join(" "),
    image: usableUser.avatarUrl,
    roles: usableUser.roles.map(({ role }) => role.name),
  };
}
