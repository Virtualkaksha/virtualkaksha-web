"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  {
    label: "Dashboard",
    icon: "🏠",
    href: "/student",
  },
  {
    label: "Study Resources",
    icon: "📚",
    href: "/student/resources",
  },
  {
    label: "NCERT Solutions",
    icon: "📘",
    href: "/student/ncert-solutions",
  },
  {
    label: "Video Lectures",
    icon: "🎥",
    href: "/student/video-lectures",
  },
  {
    label: "Tests",
    icon: "📝",
    href: "/student/tests",
  },
  {
    label: "Courses",
    icon: "🎓",
    href: "/student/courses",
  },
  {
    label: "Teachers",
    icon: "👨‍🏫",
    href: "/student/teachers",
  },
  {
    label: "Coaching Institutes",
    icon: "🏫",
    href: "/student/coachings",
  },
  {
    label: "Saved",
    icon: "❤️",
    href: "/student/saved",
  },
  {
    label: "Progress",
    icon: "📈",
    href: "/student/progress",
  },
];

export default function StudentSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="border-b border-slate-200 px-6 py-6">
          <Link href="/" className="text-2xl font-bold text-blue-700">
            VirtualKaksha
          </Link>

          <p className="mt-1 text-sm text-slate-500">Student Learning Panel</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          {navigationItems.map((item) => {
            const isActive =
              item.href === "/student"
                ? pathname === "/student"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span aria-hidden="true" className="text-lg">
                  {item.icon}
                </span>

                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <Link
            href="/student/profile"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <span className="text-lg">👤</span>
            My Profile
          </Link>
        </div>
      </div>
    </aside>
  );
}