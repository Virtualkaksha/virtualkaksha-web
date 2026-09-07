import "server-only";

import prisma from "@/lib/prisma";

/**
 * Published educator fields only. Contact details, ownership and moderation
 * columns are deliberately absent so a student view cannot leak them.
 */
export const publishedTeacherSelect = {
  id: true,
  headline: true,
  bio: true,
  yearsOfExperience: true,
  highestQualification: true,
  teachingMode: true,
  city: true,
  verificationStatus: true,
  user: { select: { displayName: true, firstName: true, lastName: true, avatarUrl: true } },
  _count: { select: { resourceLinks: true } },
} as const;

export const publishedInstituteSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  logoUrl: true,
  website: true,
  city: true,
  teachingMode: true,
  verificationStatus: true,
} as const;

export type PublishedTeacherRecord = {
  id: string;
  headline: string | null;
  bio: string | null;
  yearsOfExperience: number | null;
  highestQualification: string | null;
  teachingMode: "ONLINE" | "OFFLINE" | "HYBRID" | null;
  city: string | null;
  verificationStatus: string;
  user: { displayName: string | null; firstName: string; lastName: string | null; avatarUrl: string | null };
  _count: { resourceLinks: number };
};

export type PublishedInstituteRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  city: string | null;
  teachingMode: "ONLINE" | "OFFLINE" | "HYBRID" | null;
  verificationStatus: string;
};

export type StudentAccountRecord = {
  email: string;
  firstName: string;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  roles: Array<{ role: { name: string } }>;
};

export function findPublishedTeacherProfiles(take: number): Promise<PublishedTeacherRecord[]> {
  return prisma.teacherProfile.findMany({
    where: { profileStatus: "PUBLISHED", publishedAt: { not: null } },
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    take,
    select: publishedTeacherSelect,
  }) as unknown as Promise<PublishedTeacherRecord[]>;
}

export function findPublishedCoachingInstitutes(take: number): Promise<PublishedInstituteRecord[]> {
  return prisma.coachingInstitute.findMany({
    where: { profileStatus: "PUBLISHED", publishedAt: { not: null } },
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    take,
    select: publishedInstituteSelect,
  }) as unknown as Promise<PublishedInstituteRecord[]>;
}

export function findStudentAccountById(userId: string): Promise<StudentAccountRecord | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      displayName: true,
      avatarUrl: true,
      createdAt: true,
      lastLoginAt: true,
      roles: { select: { role: { select: { name: true } } } },
    },
  }) as unknown as Promise<StudentAccountRecord | null>;
}
