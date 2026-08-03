import type { ReactNode } from "react";

import StudentSidebar from "../components/student/StudentSidebar";
import StudentTopbar from "../components/student/StudentTopbar";
import { requireCurrentRole } from "@/lib/auth/current-identity";

type StudentLayoutProps = {
  children: ReactNode;
};

export default async function StudentLayout({ children }: StudentLayoutProps) {
  await requireCurrentRole("STUDENT");

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
