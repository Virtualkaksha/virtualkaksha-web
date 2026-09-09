import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  Clock3,
  Eye,
  FileText,
  Inbox,
  XCircle,
} from "lucide-react";

import { requireAnyCurrentRole } from "@/lib/auth/current-identity";
import { getTeacherDashboardCms } from "@/lib/teacher/teacher-cms";

export default async function TeacherDashboardPage() {
  const user = await requireAnyCurrentRole(["TEACHER", "ADMIN"]);
  const cms = await getTeacherDashboardCms(user.id);
  const attentionItems = [...cms.inbox.rejected.slice(0, 3), ...cms.inbox.pending.slice(0, 2)];

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-slate-950 p-7 text-white sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Teacher workspace</p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Welcome, {cms.displayName}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Create, review and manage chapter-wise learning resources from one dashboard.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/teacher/questions/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950"
          >
            Add a test question <ArrowRight size={17} />
          </Link>
          <Link
            href="/teacher/resources"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-bold text-white hover:bg-white/15"
          >
            Open resource manager
          </Link>
          <Link
            href="/teacher/inbox"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-bold text-white hover:bg-white/15"
          >
            <Inbox size={17} />
            Status inbox
            {cms.totals.attention > 0 ? (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs">{cms.totals.attention}</span>
            ) : null}
          </Link>
        </div>
      </section>

      {!cms.teacherProfile ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Your account has teacher access but no TeacherProfile yet. Run the included role setup script once to create it.
        </div>
      ) : null}

      {cms.totals.attention > 0 ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-800">Needs your attention</p>
              <h2 className="mt-1 text-2xl font-bold text-amber-950">
                {cms.totals.rejected} rejected · {cms.totals.pending} waiting for review
              </h2>
            </div>
            <Link href="/teacher/inbox" className="text-sm font-bold text-amber-900 hover:underline">
              Open inbox →
            </Link>
          </div>
          <div className="mt-5 divide-y divide-amber-200/70">
            {attentionItems.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-amber-950">{item.title}</p>
                  <p className="mt-1 text-xs text-amber-800">
                    {item.status.replaceAll("_", " ")}
                    {item.moderationNote ? ` · ${item.moderationNote}` : ""}
                  </p>
                </div>
                <Link
                  href={item.status === "REJECTED" ? `/teacher/resources/${item.id}/edit` : `/teacher/resources/${item.id}`}
                  className="text-sm font-semibold text-amber-950"
                >
                  {item.status === "REJECTED" ? "Fix now" : "View"} →
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<FileText size={20} />} label="Total resources" value={cms.totals.resources} href="/teacher/resources" />
        <StatCard icon={<BookOpenCheck size={20} />} label="Published" value={cms.totals.published} href="/teacher/resources?status=PUBLISHED" />
        <StatCard icon={<Clock3 size={20} />} label="Pending review" value={cms.totals.pending} href="/teacher/inbox#pending" />
        <StatCard icon={<XCircle size={20} />} label="Rejected" value={cms.totals.rejected} href="/teacher/inbox#rejected" />
        <StatCard icon={<Eye size={20} />} label="Total views" value={cms.totals.views} href="/teacher/resources" />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">Recent work</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">Latest resources</h2>
          </div>
          <Link href="/teacher/resources" className="text-sm font-bold text-blue-700">
            View all
          </Link>
        </div>
        <div className="mt-6 divide-y divide-slate-100">
          {cms.resources.slice(0, 5).map((resource) => (
            <div key={resource.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-950">{resource.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {resource.resourceType.name} · {resource.status.replaceAll("_", " ")}
                </p>
                {resource.moderationNote && resource.status === "REJECTED" ? (
                  <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-rose-700">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    {resource.moderationNote}
                  </p>
                ) : null}
              </div>
              <Link
                href={`/teacher/resources/${resource.id}`}
                className="text-sm font-semibold text-blue-700"
              >
                Open
              </Link>
            </div>
          ))}
          {cms.resources.length === 0 ? (
            <p className="py-8 text-sm text-slate-500">No resources created yet.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">{icon}</div>
      <p className="mt-4 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </Link>
  );
}
