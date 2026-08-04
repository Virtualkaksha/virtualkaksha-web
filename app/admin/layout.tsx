import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, ClipboardList, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";

import { logoutAction } from "@/app/(auth)/actions";
import { requireCurrentRole } from "@/lib/auth/current-identity";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireCurrentRole("ADMIN");
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/admin" className="flex items-center gap-3 font-bold text-slate-950">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white"><ShieldCheck size={20} /></span>
            <span>VirtualKaksha Admin</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700"><LayoutDashboard size={17} />Dashboard</Link>
            <Link href="/admin/resources" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700"><BookOpen size={17} />Moderation</Link>
            <Link href="/admin/resources/inventory" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700"><ClipboardList size={17} />Resource inventory</Link>
            <Link href="/search" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700">Public resources</Link>
            <form action={logoutAction}><button type="submit" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-rose-700"><LogOut size={17} />Logout</button></form>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
