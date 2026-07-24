import type { ReactNode } from "react";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/admin"
            className="text-xl font-bold text-slate-900"
          >
            VirtualKaksha Admin
          </Link>

          <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold">
            <Link
              href="/admin"
              className="text-slate-600 transition hover:text-blue-700"
            >
              Dashboard
            </Link>

            <Link
              href="/admin/resources"
              className="text-slate-600 transition hover:text-blue-700"
            >
              Resources
            </Link>

            <Link
              href="/student/resources"
              className="text-slate-600 transition hover:text-blue-700"
            >
              Student Site
            </Link>
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
}