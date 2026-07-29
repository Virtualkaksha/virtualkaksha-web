"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bookmark,
  BookOpen,
  GraduationCap,
  Home,
  LibraryBig,
  PlaySquare,
  School,
  Settings,
  TestTube2,
  UserRound,
  UsersRound,
} from "lucide-react";

export const studentNavigationItems = [
  { label: "Dashboard", icon: Home, href: "/student" },
  { label: "Study Resources", icon: LibraryBig, href: "/student/resources" },
  { label: "NCERT Solutions", icon: BookOpen, href: "/student/ncert-solutions" },
  { label: "Video Lectures", icon: PlaySquare, href: "/student/video-lectures" },
  { label: "Tests", icon: TestTube2, href: "/student/tests" },
  { label: "Courses", icon: GraduationCap, href: "/student/courses" },
  { label: "Teachers", icon: UsersRound, href: "/student/teachers" },
  { label: "Institutes", icon: School, href: "/student/coachings" },
  { label: "Saved", icon: Bookmark, href: "/student/bookmarks" },
  { label: "Continue Learning", icon: BarChart3, href: "/student/continue-learning" },
];

export function isStudentNavigationActive(pathname: string, href: string) {
  return href === "/student" ? pathname === href : pathname.startsWith(href);
}

export default function StudentSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-[280px] shrink-0 border-r border-slate-200/80 bg-white lg:block">
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="px-5 pb-5 pt-6">
          <Link href="/student" className="flex items-center gap-3 rounded-xl px-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white shadow-sm">
              VK
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight text-slate-950">VirtualKaksha</span>
              <span className="block text-xs font-medium text-slate-500">Student workspace</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 pb-5">
          {studentNavigationItems.map((item) => {
            const active = isStudentNavigationActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200/80 p-4">
          <Link href="/student/profile" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950">
            <UserRound className="h-[18px] w-[18px]" aria-hidden="true" />
            My profile
          </Link>
          <Link href="/student/settings" className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950">
            <Settings className="h-[18px] w-[18px]" aria-hidden="true" />
            Settings
          </Link>
        </div>
      </div>
    </aside>
  );
}
