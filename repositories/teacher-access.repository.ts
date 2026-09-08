import "server-only";

import type { TeacherAccessRequestStatus } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";

export function findPendingTeacherAccessByEmail(email: string) {
  return prisma.teacherAccessRequest.findFirst({
    where: { email, status: "PENDING" },
    select: { id: true },
  });
}

export function createTeacherAccessRequest(input: {
  firstName: string;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  city?: string | null;
  subjects: string;
  experienceYears?: number | null;
  message?: string | null;
  passwordHash: string;
}) {
  return prisma.teacherAccessRequest.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName || null,
      email: input.email,
      phone: input.phone || null,
      city: input.city || null,
      subjects: input.subjects,
      experienceYears: input.experienceYears ?? null,
      message: input.message || null,
      passwordHash: input.passwordHash,
      status: "PENDING",
    },
    select: { id: true },
  });
}

export function countTeacherAccessRequests(status?: TeacherAccessRequestStatus) {
  return prisma.teacherAccessRequest.count({
    where: status ? { status } : undefined,
  });
}

export function findTeacherAccessRequests(status?: TeacherAccessRequestStatus) {
  return prisma.teacherAccessRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      city: true,
      subjects: true,
      experienceYears: true,
      message: true,
      status: true,
      adminNote: true,
      reviewedAt: true,
      createdAt: true,
      reviewedBy: {
        select: { displayName: true, firstName: true, lastName: true, email: true },
      },
      createdUser: {
        select: { id: true, email: true },
      },
    },
  });
}

export function findTeacherAccessRequestById(id: string) {
  return prisma.teacherAccessRequest.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      city: true,
      subjects: true,
      experienceYears: true,
      message: true,
      passwordHash: true,
      status: true,
      adminNote: true,
      createdAt: true,
    },
  });
}

const teacherUserSelect = {
  id: true,
  roles: { select: { role: { select: { name: true } } } },
  teacherProfile: { select: { id: true } },
} as const;

function usablePhone(phone: string | null | undefined) {
  const value = phone?.trim();
  return value ? value : null;
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

function teacherProfileData(request: {
  city: string | null;
  experienceYears: number | null;
  message: string | null;
  subjects: string;
}) {
  return {
    city: request.city,
    yearsOfExperience: request.experienceYears,
    bio: request.message,
    headline: request.subjects.slice(0, 120),
    verificationStatus: "VERIFIED" as const,
    profileStatus: "PUBLISHED" as const,
  };
}

async function createTeacherUser(request: {
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  passwordHash: string;
  city: string | null;
  experienceYears: number | null;
  message: string | null;
  subjects: string;
}, teacherRoleId: string) {
  const phone = usablePhone(request.phone);
  const phoneTaken = phone
    ? await prisma.user.findFirst({ where: { phone }, select: { id: true } })
    : null;
  const data = {
    firstName: request.firstName,
    lastName: request.lastName,
    displayName: [request.firstName, request.lastName].filter(Boolean).join(" "),
    email: request.email,
    phone: phoneTaken ? null : phone,
    passwordHash: request.passwordHash,
    status: "ACTIVE" as const,
    roles: { create: { roleId: teacherRoleId } },
    teacherProfile: { create: teacherProfileData(request) },
  };

  try {
    return await prisma.user.create({ data, select: teacherUserSelect });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const existing = await prisma.user.findUnique({
      where: { email: request.email },
      select: teacherUserSelect,
    });
    if (existing) return existing;
    if (data.phone == null) throw error;
    return prisma.user.create({
      data: { ...data, phone: null },
      select: teacherUserSelect,
    });
  }
}

export async function approveTeacherAccessRequest(input: {
  requestId: string;
  adminId: string;
}) {
  try {
    return await approvePendingTeacherAccessRequest(input);
  } catch {
    return { outcome: "failed" as const };
  }
}

async function approvePendingTeacherAccessRequest(input: {
  requestId: string;
  adminId: string;
}) {
  // Neon pooled connections cannot run Prisma interactive transactions.
  // Keep this path as sequential queries with an optimistic PENDING claim.
  const request = await prisma.teacherAccessRequest.findUnique({
    where: { id: input.requestId },
  });
  if (!request || request.status !== "PENDING") {
    return { outcome: "unavailable" as const };
  }

  const teacherRole = await prisma.role.upsert({
    where: { name: "TEACHER" },
    update: {},
    create: { name: "TEACHER" },
    select: { id: true },
  });

  let user = await prisma.user.findUnique({
    where: { email: request.email },
    select: teacherUserSelect,
  });

  if (user?.roles.some((entry) => entry.role.name === "TEACHER")) {
    await prisma.teacherAccessRequest.updateMany({
      where: { id: request.id, status: "PENDING" },
      data: {
        status: "APPROVED",
        reviewedByUserId: input.adminId,
        reviewedAt: new Date(),
        createdUserId: user.id,
        adminNote: "Applicant already had teacher access.",
      },
    });
    return { outcome: "already-teacher" as const, userId: user.id };
  }

  if (!user) {
    user = await createTeacherUser(request, teacherRole.id);
  } else {
    await prisma.userRole.createMany({
      data: [{ userId: user.id, roleId: teacherRole.id }],
      skipDuplicates: true,
    });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: "ACTIVE",
        sessionVersion: { increment: 1 },
        passwordHash: request.passwordHash,
      },
    });
    if (!user.teacherProfile) {
      await prisma.teacherProfile.create({
        data: {
          userId: user.id,
          ...teacherProfileData(request),
        },
      });
    } else {
      await prisma.teacherProfile.update({
        where: { userId: user.id },
        data: {
          city: request.city ?? undefined,
          yearsOfExperience: request.experienceYears ?? undefined,
          verificationStatus: "VERIFIED",
          profileStatus: "PUBLISHED",
        },
      });
    }
  }

  const claimed = await prisma.teacherAccessRequest.updateMany({
    where: { id: request.id, status: "PENDING" },
    data: {
      status: "APPROVED",
      reviewedByUserId: input.adminId,
      reviewedAt: new Date(),
      createdUserId: user.id,
    },
  });
  if (claimed.count === 0) {
    return { outcome: "unavailable" as const };
  }

  return { outcome: "approved" as const, userId: user.id };
}

export async function rejectTeacherAccessRequest(input: {
  requestId: string;
  adminId: string;
  reason: string;
}) {
  const updated = await prisma.teacherAccessRequest.updateMany({
    where: { id: input.requestId, status: "PENDING" },
    data: {
      status: "REJECTED",
      reviewedByUserId: input.adminId,
      reviewedAt: new Date(),
      adminNote: input.reason,
    },
  });
  return updated.count > 0 ? ({ outcome: "rejected" as const }) : ({ outcome: "unavailable" as const });
}
