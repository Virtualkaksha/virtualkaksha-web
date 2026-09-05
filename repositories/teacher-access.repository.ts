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

export async function approveTeacherAccessRequest(input: {
  requestId: string;
  adminId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.teacherAccessRequest.findUnique({
      where: { id: input.requestId },
    });
    if (!request || request.status !== "PENDING") {
      return { outcome: "unavailable" as const };
    }

    const teacherRole = await tx.role.upsert({
      where: { name: "TEACHER" },
      update: {},
      create: { name: "TEACHER" },
      select: { id: true },
    });

    let user = await tx.user.findUnique({
      where: { email: request.email },
      select: {
        id: true,
        roles: { select: { role: { select: { name: true } } } },
        teacherProfile: { select: { id: true } },
      },
    });

    if (user?.roles.some((entry) => entry.role.name === "TEACHER")) {
      await tx.teacherAccessRequest.update({
        where: { id: request.id },
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
      user = await tx.user.create({
        data: {
          firstName: request.firstName,
          lastName: request.lastName,
          displayName: [request.firstName, request.lastName].filter(Boolean).join(" "),
          email: request.email,
          phone: request.phone,
          passwordHash: request.passwordHash,
          status: "ACTIVE",
          roles: { create: { roleId: teacherRole.id } },
          teacherProfile: {
            create: {
              city: request.city,
              yearsOfExperience: request.experienceYears,
              bio: request.message,
              headline: request.subjects.slice(0, 120),
              verificationStatus: "VERIFIED",
              profileStatus: "PUBLISHED",
            },
          },
        },
        select: {
          id: true,
          roles: { select: { role: { select: { name: true } } } },
          teacherProfile: { select: { id: true } },
        },
      });
    } else {
      await tx.userRole.createMany({
        data: [{ userId: user.id, roleId: teacherRole.id }],
        skipDuplicates: true,
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          status: "ACTIVE",
          sessionVersion: { increment: 1 },
          passwordHash: request.passwordHash,
        },
      });
      if (!user.teacherProfile) {
        await tx.teacherProfile.create({
          data: {
            userId: user.id,
            city: request.city,
            yearsOfExperience: request.experienceYears,
            bio: request.message,
            headline: request.subjects.slice(0, 120),
            verificationStatus: "VERIFIED",
            profileStatus: "PUBLISHED",
          },
        });
      } else {
        await tx.teacherProfile.update({
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

    await tx.teacherAccessRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        reviewedByUserId: input.adminId,
        reviewedAt: new Date(),
        createdUserId: user.id,
      },
    });

    return { outcome: "approved" as const, userId: user.id };
  });
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
