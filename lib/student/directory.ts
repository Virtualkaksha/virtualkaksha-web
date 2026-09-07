import "server-only";

import {
  findPublishedCoachingInstitutes,
  findPublishedTeacherProfiles,
  findStudentAccountById,
  type PublishedInstituteRecord,
  type PublishedTeacherRecord,
  type StudentAccountRecord,
} from "@/repositories/student-directory.repository";

const DIRECTORY_PAGE_SIZE = 24;

const TEACHING_MODE_LABELS = {
  ONLINE: "Online",
  OFFLINE: "In person",
  HYBRID: "Online and in person",
} as const;

export type DirectoryTeacher = {
  id: string;
  name: string;
  initials: string;
  headline: string | null;
  summary: string | null;
  experienceLabel: string | null;
  qualification: string | null;
  teachingModeLabel: string | null;
  city: string | null;
  isVerified: boolean;
  resourceCount: number;
};

export type DirectoryInstitute = {
  id: string;
  name: string;
  initials: string;
  summary: string | null;
  teachingModeLabel: string | null;
  city: string | null;
  website: string | null;
  isVerified: boolean;
};

export type StudentAccountSummary = {
  name: string;
  initials: string;
  email: string;
  roles: string[];
  memberSince: string;
  lastSignIn: string | null;
};

function displayName(user: { displayName: string | null; firstName: string; lastName: string | null }) {
  const composed = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return user.displayName?.trim() || composed || "VirtualKaksha educator";
}

function initialsFor(value: string) {
  const parts = value.split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((part) => part[0]).join("");
  return (letters || value.slice(0, 2)).toUpperCase();
}

function teachingModeLabel(mode: PublishedTeacherRecord["teachingMode"]) {
  return mode ? TEACHING_MODE_LABELS[mode] : null;
}

function httpUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(value);
}

function toDirectoryTeacher(record: PublishedTeacherRecord): DirectoryTeacher {
  const name = displayName(record.user);
  return {
    id: record.id,
    name,
    initials: initialsFor(name),
    headline: record.headline?.trim() || null,
    summary: record.bio?.trim() || null,
    experienceLabel: typeof record.yearsOfExperience === "number" && record.yearsOfExperience > 0
      ? `${record.yearsOfExperience} ${record.yearsOfExperience === 1 ? "year" : "years"} teaching`
      : null,
    qualification: record.highestQualification?.trim() || null,
    teachingModeLabel: teachingModeLabel(record.teachingMode),
    city: record.city?.trim() || null,
    isVerified: record.verificationStatus === "VERIFIED",
    resourceCount: record._count.resourceLinks,
  };
}

function toDirectoryInstitute(record: PublishedInstituteRecord): DirectoryInstitute {
  return {
    id: record.id,
    name: record.name,
    initials: initialsFor(record.name),
    summary: record.description?.trim() || null,
    teachingModeLabel: teachingModeLabel(record.teachingMode),
    city: record.city?.trim() || null,
    website: httpUrl(record.website),
    isVerified: record.verificationStatus === "VERIFIED",
  };
}

/** Returns null when the directory cannot be read, so pages can degrade quietly. */
export async function getPublishedTeacherDirectory(): Promise<DirectoryTeacher[] | null> {
  try {
    const records = await findPublishedTeacherProfiles(DIRECTORY_PAGE_SIZE);
    return records.map(toDirectoryTeacher);
  } catch {
    return null;
  }
}

export async function getPublishedInstituteDirectory(): Promise<DirectoryInstitute[] | null> {
  try {
    const records = await findPublishedCoachingInstitutes(DIRECTORY_PAGE_SIZE);
    return records.map(toDirectoryInstitute);
  } catch {
    return null;
  }
}

export async function getStudentAccountSummary(userId: string): Promise<StudentAccountSummary | null> {
  let record: StudentAccountRecord | null;
  try {
    record = await findStudentAccountById(userId);
  } catch {
    return null;
  }
  if (!record) return null;

  const name = displayName(record);
  return {
    name,
    initials: initialsFor(name),
    email: record.email,
    roles: record.roles.map((entry) => entry.role.name),
    memberSince: formatDate(record.createdAt),
    lastSignIn: record.lastLoginAt ? formatDate(record.lastLoginAt) : null,
  };
}
