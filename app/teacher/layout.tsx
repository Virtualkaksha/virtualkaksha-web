import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, LayoutDashboard, LibraryBig } from "lucide-react";

import { requireTeacher } from "@/lib/auth/session";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  await requireTeacher();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Link href="/teacher" className="text-xl font-bold text-slate-950">
            VirtualKaksha Teacher
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <Link href="/teacher" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700">
              <LayoutDashboard size={17} /> Dashboard
            </Link>
            <Link href="/teacher/resources" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700">
              <LibraryBig size={17} /> Resources
            </Link>
            <Link href="/student/resources" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700">
              <BookOpen size={17} /> Student site
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
