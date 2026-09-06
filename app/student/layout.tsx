import type { ReactNode } from "react";
import Link from "next/link";

import Navbar from "../components/Navbar";
import StudentSidebar from "../components/student/StudentSidebar";
import StudentTopbar from "../components/student/StudentTopbar";
import { getCurrentIdentity } from "@/lib/auth/current-identity";

type StudentLayoutProps = {
  children: ReactNode;
};

export default async function StudentLayout({ children }: StudentLayoutProps) {
  const identity = await getCurrentIdentity();
  const isStudent = Boolean(identity?.roles.includes("STUDENT"));

  if (!isStudent) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f7f8fa]">
        <Navbar />
        <div className="border-b border-blue-100 bg-blue-50 px-4 py-3 text-center text-sm text-blue-950 sm:px-6">
          Browsing free study resources.{" "}
          <Link href="/login" className="font-semibold text-blue-700 underline-offset-2 hover:underline">
            Sign in
          </Link>{" "}
          to bookmark material and save reading progress.
        </div>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="flex min-h-screen">
        <StudentSidebar />
        <div className="min-w-0 flex-1">
          <StudentTopbar />
          <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
