"use client";

import Link from "next/link";

import { STUDENT_AVATAR_SRC } from "@/lib/students/nav-profile";
import type { StudentNavProfile } from "@/lib/students/nav-profile";

export function StudentAvatar({
  initials,
  hasPhoto,
  className,
}: {
  initials: string;
  hasPhoto: boolean;
  className?: string;
}) {
  return (
    <span className={`flex shrink-0 overflow-hidden rounded-full bg-slate-950 font-bold text-white ${className ?? "h-10 w-10 text-sm"}`}>
      {hasPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={STUDENT_AVATAR_SRC} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center">{initials}</span>
      )}
    </span>
  );
}

export function StudentProfileChip({
  profile,
  onNavigate,
}: {
  profile: StudentNavProfile;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href="/student/profile"
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-100"
    >
      <StudentAvatar initials={profile.initials} hasPhoto={profile.hasPhoto} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-950">{profile.name}</span>
        <span className="block text-xs font-medium text-slate-500">My Profile</span>
      </span>
    </Link>
  );
}
