import { NextResponse } from "next/server";
import type { RoleName } from "@/app/generated/prisma/enums";

import { getRateLimitAdapter, rateLimitResponse, type RateLimitAdapter } from "@/lib/rate-limit";
import { mutateStudentBookmark } from "@/lib/resources/student-learning";
import {
  type StudentUser,
} from "@/lib/resources/student-resource-service";
import {
  CURRENT_IDENTITY_PRIVATE_HEADERS,
  currentIdentityFailureStatus,
  resolveCurrentIdentityForApi,
  type CurrentIdentityResult,
} from "@/lib/auth/current-identity";

type BookmarkRouteDependencies = {
  resolveIdentity?: () => Promise<CurrentIdentityResult>;
  /** Test seam for an already-validated current identity. */
  getCurrentUser?: () => Promise<StudentUser | null>;
  mutateBookmark?: typeof mutateStudentBookmark;
  rateLimit?: RateLimitAdapter;
};

async function resolveStudentIdentity(dependencies: BookmarkRouteDependencies): Promise<CurrentIdentityResult> {
  if (dependencies.resolveIdentity) return dependencies.resolveIdentity();
  if (dependencies.getCurrentUser) {
    try {
      const user = await dependencies.getCurrentUser();
      if (!user) return { ok: false, code: "NO_SESSION", message: "Authentication is required." };
      if (!user.roles.includes("STUDENT")) return { ok: false, code: "FORBIDDEN", message: "Access is denied." };
      return { ok: true, identity: { ...user, roles: user.roles as RoleName[], sessionVersion: 1 } };
    } catch {
      return { ok: false, code: "IDENTITY_UNAVAILABLE", message: "Authentication is temporarily unavailable." };
    }
  }
  return resolveCurrentIdentityForApi(["STUDENT"]);
}

export function isSameOriginMutation(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function errorStatus(code: string) {
  if (code === "UNAUTHENTICATED") return 401;
  if (code === "FORBIDDEN") return 403;
  return 404;
}

export async function handleBookmarkMutation(
  request: Request,
  resourceId: string,
  bookmarked: boolean,
  dependencies: BookmarkRouteDependencies = {},
) {
  const identity = await resolveStudentIdentity(dependencies);
  if (!identity.ok) {
    return NextResponse.json(
      { error: identity.message },
      { status: currentIdentityFailureStatus(identity.code), headers: CURRENT_IDENTITY_PRIVATE_HEADERS },
    );
  }
  const user = identity.identity;
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  try {
    const decision = await (dependencies.rateLimit ?? getRateLimitAdapter()).check("bookmark-user", user.id);
    if (!decision.allowed && decision.reason !== "backend-unavailable") return rateLimitResponse(decision);
  } catch {
    // Bookmark writes intentionally fail open when the distributed limiter is unavailable.
  }
  const result = await (dependencies.mutateBookmark ?? mutateStudentBookmark)({
    user,
    resourceId,
    bookmarked,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: errorStatus(result.code) });
  }
  return NextResponse.json({ resourceId: result.resourceId, bookmarked: result.bookmarked });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ resourceId: string }> },
) {
  return handleBookmarkMutation(request, (await params).resourceId, true);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ resourceId: string }> },
) {
  return handleBookmarkMutation(request, (await params).resourceId, false);
}
