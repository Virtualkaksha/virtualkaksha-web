import Link from "next/link";
import { Archive, BookOpenCheck, GraduationCap, ShieldAlert, UserPlus, UsersRound, XCircle } from "lucide-react";

import { getAdminDashboard } from "@/lib/admin/moderation";
import { countTeacherAccessRequests } from "@/repositories/teacher-access.repository";

export default async function AdminDashboardPage() {
  const [data, pendingTeacherAccess] = await Promise.all([
    getAdminDashboard(),
    countTeacherAccessRequests("PENDING"),
  ]);
  const cards = [
    ["Pending review", data.pending, ShieldAlert, "/admin/resources?status=PENDING_REVIEW"],
    ["Teacher access requests", pendingTeacherAccess, UserPlus, "/admin/teacher-requests"],
    ["Published", data.published, BookOpenCheck, "/admin/resources?status=PUBLISHED"],
    ["Rejected", data.rejected, XCircle, "/admin/resources?status=REJECTED"],
    ["Archived", data.archived, Archive, "/admin/resources?status=ARCHIVED"],
    ["Teachers", data.teachers, GraduationCap, "/admin/teacher-requests?status=APPROVED"],
    ["Students", data.students, UsersRound, "/admin/resources"],
  ] as const;
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-slate-950 px-7 py-9 text-white sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[.18em] text-blue-300">Administration</p>
        <div className="mt-3 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-bold">Content control centre</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Review teacher access requests, moderate submissions, and keep the student catalogue safe and accurate.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/admin/teacher-requests" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 font-semibold text-white hover:bg-white/15">
              Teacher requests →
            </Link>
            <Link href="/admin/resources?status=PENDING_REVIEW" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 font-semibold text-slate-950">
              Open content queue →
            </Link>
          </div>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value, Icon, href]) => (
          <Link key={label} href={href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Icon className="text-blue-700" />
            <p className="mt-5 text-3xl font-bold text-slate-950">{value}</p>
            <p className="mt-1 text-sm text-slate-600">{label}</p>
          </Link>
        ))}
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">Latest activity</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">Recently updated resources</h2>
          </div>
          <Link href="/admin/resources" className="text-sm font-semibold text-blue-700">View all</Link>
        </div>
        <div className="mt-6 divide-y divide-slate-100">
          {data.recent.length ? data.recent.map((item) => (
            <Link key={item.id} href={`/admin/resources/${item.id}`} className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">{item.resourceType.name} · {item.creatorName}</p>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{item.status.replaceAll("_", " ")}</span>
            </Link>
          )) : <p className="py-8 text-sm text-slate-500">No resource activity yet.</p>}
        </div>
      </section>
    </main>
  );
}
