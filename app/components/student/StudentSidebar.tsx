"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  Bookmark,
  Building2,
  CircleHelp,
  CircleUserRound,
  ClipboardList,
  Home,
  LibraryBig,
  LogOut,
  MonitorPlay,
  ScrollText,
  Users,
} from "lucide-react";

import { logoutAction } from "@/app/(auth)/actions";
import { CATALOGUE_TYPE_SLUGS, STUDENT_CATALOGUE_SEARCH_PATH, studentCatalogueTypeHref } from "@/lib/resources/catalogue-types";

export { STUDENT_CATALOGUE_SEARCH_PATH };

/**
 * Entries carrying a resourceType are filtered views of the existing published
 * catalogue rather than separate pages, so they cannot show content that does
 * not exist.
 */
export const studentNavigationItems = [
  { label: "Dashboard", icon: Home, href: "/student" },
  { label: "Study Resources", icon: LibraryBig, href: "/student/resources" },
  {
    label: "NCERT Solutions",
    icon: BookOpenCheck,
    href: studentCatalogueTypeHref(CATALOGUE_TYPE_SLUGS.ncertSolutions),
    resourceType: CATALOGUE_TYPE_SLUGS.ncertSolutions,
  },
  {
    label: "Video Lectures",
    icon: MonitorPlay,
    href: studentCatalogueTypeHref(CATALOGUE_TYPE_SLUGS.videoLectures),
    resourceType: CATALOGUE_TYPE_SLUGS.videoLectures,
  },
  {
    label: "Previous Year Papers",
    icon: ScrollText,
    href: studentCatalogueTypeHref(CATALOGUE_TYPE_SLUGS.previousYearQuestions),
    resourceType: CATALOGUE_TYPE_SLUGS.previousYearQuestions,
  },
  {
    label: "Tests",
    icon: ClipboardList,
    href: "/student/tests",
  },
  { label: "Saved", icon: Bookmark, href: "/student/bookmarks" },
  { label: "Continue Learning", icon: BarChart3, href: "/student/continue-learning" },
  { label: "Teachers", icon: Users, href: "/student/teachers" },
  { label: "Coaching Institutes", icon: Building2, href: "/student/coaching-institutes" },
  { label: "My Profile", icon: CircleUserRound, href: "/student/profile" },
] as const;

export const studentSupportNavigationItem = {
  label: "Help & Support",
  icon: CircleHelp,
  href: "/contact",
};

const navigationResourceTypes: ReadonlySet<string> = new Set<string>(
  studentNavigationItems.flatMap((item) => ("resourceType" in item ? [item.resourceType] : [])),
);

export function isStudentNavigationActive(
  pathname: string,
  item: { href: string; resourceType?: string },
  activeResourceType?: string | null,
) {
  const currentType = activeResourceType?.trim() || null;

  if (item.resourceType) {
    return pathname === STUDENT_CATALOGUE_SEARCH_PATH && currentType === item.resourceType;
  }
  if (item.href === "/student") return pathname === "/student";
  if (item.href === "/student/resources") {
    // A filtered view owns the highlight instead of the catalogue root.
    if (pathname === STUDENT_CATALOGUE_SEARCH_PATH && currentType && navigationResourceTypes.has(currentType)) {
      return false;
    }
    return pathname === "/student/resources" || pathname.startsWith("/student/resources/");
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function StudentSidebar() {
  const pathname = usePathname();
  const activeResourceType = useSearchParams().get("type");

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
            const active = isStudentNavigationActive(pathname, item, activeResourceType);
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
          <Link href={studentSupportNavigationItem.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950">
            <CircleHelp className="h-[18px] w-[18px]" aria-hidden="true" />
            {studentSupportNavigationItem.label}
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-rose-700">
              <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
              Logout
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
