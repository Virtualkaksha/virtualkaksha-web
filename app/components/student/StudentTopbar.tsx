"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Search, X } from "lucide-react";
import { useState } from "react";

import { isStudentNavigationActive, studentNavigationItems, studentSupportNavigationItem } from "./StudentSidebar";
import { logoutAction } from "@/app/(auth)/actions";

export default function StudentTopbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const SupportIcon = studentSupportNavigationItem.icon;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="flex min-h-[72px] items-center gap-3 px-5 sm:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Student dashboard</p>
            <h1 className="truncate text-base font-bold text-slate-950 sm:text-lg">Welcome back to VirtualKaksha</h1>
          </div>

          <Link
            href="/student/resources"
            className="hidden min-h-10 min-w-64 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 transition hover:border-slate-300 hover:bg-white md:flex"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Search learning resources
          </Link>

        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
          <aside className="relative h-full w-[min(88vw,340px)] overflow-y-auto bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between px-2 py-2">
              <Link href="/student" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">VK</span>
                <span className="font-bold text-slate-950">VirtualKaksha</span>
              </Link>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-5 space-y-1">
              {studentNavigationItems.map((item) => {
                const active = isStudentNavigationActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                    <Icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <Link href={studentSupportNavigationItem.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                <SupportIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                {studentSupportNavigationItem.label}
              </Link>
            </div>
            <form action={logoutAction} className="mt-5 border-t border-slate-200 pt-4">
              <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-rose-700">
                <LogOut className="h-[18px] w-[18px]" />
                Logout
              </button>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
