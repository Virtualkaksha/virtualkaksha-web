import type { ReactNode } from "react";
import StudentSidebar from "../components/student/StudentSidebar";
import StudentTopbar from "../components/student/StudentTopbar";

type StudentLayoutProps = {
  children: ReactNode;
};

export default function StudentLayout({
  children,
}: StudentLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="min-w-0 flex-1">
          <StudentTopbar />

          <main className="px-5 py-8 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}