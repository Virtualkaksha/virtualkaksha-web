import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, ClipboardList, Inbox, LayoutDashboard, LibraryBig, LogOut } from "lucide-react";

import { logoutAction } from "@/app/(auth)/actions";
import { requireAnyCurrentRole } from "@/lib/auth/current-identity";
import { getTeacherNavBadge } from "@/lib/teacher/teacher-cms";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const user = await requireAnyCurrentRole(["TEACHER", "ADMIN"]);
  const badge = await getTeacherNavBadge(user.id);

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
            <Link href="/teacher/inbox" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700">
              <Inbox size={17} />
              Inbox
              {badge.attention > 0 ? (
                <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">
                  {badge.attention}
                </span>
              ) : null}
            </Link>
            <Link href="/teacher/resources" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700">
              <LibraryBig size={17} /> Resources
            </Link>
            <Link href="/teacher/questions" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700">
              <ClipboardList size={17} /> Questions
            </Link>
            <Link href="/search" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700">
              <BookOpen size={17} /> Public resources
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-rose-700">
                <LogOut size={17} /> Logout
              </button>
            </form>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
