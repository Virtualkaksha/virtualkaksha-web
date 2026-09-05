import "server-only";

import { hashPassword } from "@/lib/auth/password";
import type { RateLimitAdapter, RateLimitDecision } from "@/lib/rate-limit";
import { getRateLimitAdapter, resolveRequestClientIp } from "@/lib/rate-limit";
import {
  createTeacherAccessRequest,
  findPendingTeacherAccessByEmail,
} from "@/repositories/teacher-access.repository";
import { findAuthUserByEmail } from "@/repositories/auth.repository";

export type TeacherAccessSubmitResult =
  | { accepted: true }
  | { accepted: false; reason: "rate-limited"; retryAfterSeconds: number }
  | { accepted: false; reason: "duplicate-pending" }
  | { accepted: false; reason: "already-teacher" };

function unavailable(): RateLimitDecision {
  return { allowed: false, limit: 0, remaining: 0, retryAfterSeconds: 1, reason: "backend-unavailable" };
}

export async function submitTeacherAccessRequest(input: {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  city?: string;
  subjects: string;
  experienceYears?: string;
  message?: string;
  password: string;
  request: Request;
}): Promise<TeacherAccessSubmitResult> {
  const existingUser = await findAuthUserByEmail(input.email);
  if (existingUser?.roles.some((entry) => entry.role.name === "TEACHER")) {
    return { accepted: false, reason: "already-teacher" };
  }

  const pending = await findPendingTeacherAccessByEmail(input.email);
  if (pending) return { accepted: false, reason: "duplicate-pending" };

  if (process.env.NODE_ENV !== "development") {
    const ipResult = resolveRequestClientIp(input.request);
    if (!ipResult.ok) return { accepted: false, reason: "rate-limited", retryAfterSeconds: 1 };

    let limiter: RateLimitAdapter;
    try {
      limiter = getRateLimitAdapter();
    } catch {
      return { accepted: false, reason: "rate-limited", retryAfterSeconds: 1 };
    }

    for (const [policy, identifier] of [
      ["teacher-access-request-ip", ipResult.address],
      ["teacher-access-request-email", input.email],
    ] as const) {
      const decision = await limiter.check(policy, identifier).catch(() => unavailable());
      if (!decision.allowed) {
        return {
          accepted: false,
          reason: "rate-limited",
          retryAfterSeconds: Math.max(1, decision.retryAfterSeconds),
        };
      }
    }
  }

  const passwordHash = await hashPassword(input.password);
  await createTeacherAccessRequest({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    city: input.city,
    subjects: input.subjects,
    experienceYears: input.experienceYears ? Number(input.experienceYears) : null,
    message: input.message,
    passwordHash,
  });

  return { accepted: true };
}
