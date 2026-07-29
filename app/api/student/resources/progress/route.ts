import { NextResponse } from "next/server";

import { getCurrentUserIdentity, getStudentResourceProgress, saveStudentResourceProgress } from "@/lib/resources/student-resource-service";

export async function GET(request: Request) {
  const user = await getCurrentUserIdentity();
  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get("resourceId");

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!resourceId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const result = await getStudentResourceProgress({ user, resourceId });
  return NextResponse.json(result, { status: result.ok ? 200 : result.code === "FORBIDDEN" ? 403 : 404 });
}

export async function POST(request: Request) {
  const user = await getCurrentUserIdentity();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const resourceId = typeof payload.resourceId === "string" ? payload.resourceId : null;
  const page = typeof payload.page === "number" ? payload.page : undefined;
  const percent = typeof payload.percent === "number" ? payload.percent : undefined;
  const completed = typeof payload.completed === "boolean" ? payload.completed : false;

  if (!resourceId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const result = await saveStudentResourceProgress({
    user,
    resourceId,
    payload: { page, percent, completed },
  });

  if (!result.ok) {
    const status = result.code === "UNAUTHENTICATED" ? 401 : result.code === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: result.message }, { status });
  }

  return NextResponse.json(result);
}
