import { NextResponse } from "next/server";

import { getRateLimitAdapter, rateLimitResponse, type RateLimitAdapter } from "@/lib/rate-limit";
import { mutateStudentBookmark } from "@/lib/resources/student-learning";
import {
  getCurrentUserIdentity,
  type StudentUser,
} from "@/lib/resources/student-resource-service";

type BookmarkRouteDependencies = {
  getCurrentUser?: () => Promise<StudentUser | null>;
  mutateBookmark?: typeof mutateStudentBookmark;
  rateLimit?: RateLimitAdapter;
};

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
  const user = await (dependencies.getCurrentUser ?? getCurrentUserIdentity)();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
