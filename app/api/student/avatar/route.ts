import { NextResponse } from "next/server";

import {
  CURRENT_IDENTITY_PRIVATE_HEADERS,
  currentIdentityFailureStatus,
  resolveCurrentIdentityForApi,
} from "@/lib/auth/current-identity";
import prisma from "@/lib/prisma";
import { decodeStudentAvatar } from "@/lib/students/profile-avatar";

export async function GET() {
  const identity = await resolveCurrentIdentityForApi(["STUDENT"]);
  if (!identity.ok) {
    return new NextResponse(null, {
      status: currentIdentityFailureStatus(identity.code),
      headers: CURRENT_IDENTITY_PRIVATE_HEADERS,
    });
  }

  const record = await prisma.user.findUnique({
    where: { id: identity.identity.id },
    select: { avatarUrl: true },
  });
  if (!record?.avatarUrl) {
    return new NextResponse(null, { status: 404, headers: CURRENT_IDENTITY_PRIVATE_HEADERS });
  }

  const decoded = decodeStudentAvatar(record.avatarUrl);
  if (!decoded.ok) {
    return new NextResponse(null, { status: 404, headers: CURRENT_IDENTITY_PRIVATE_HEADERS });
  }

  return new NextResponse(decoded.bytes, {
    headers: {
      ...CURRENT_IDENTITY_PRIVATE_HEADERS,
      "Content-Type": decoded.mimeType,
    },
  });
}
