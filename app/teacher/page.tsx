import Link from "next/link";
import { ArrowRight, BookOpenCheck, Clock3, Eye, FileText } from "lucide-react";

import { requireTeacher } from "@/lib/auth/session";
import { getTeacherCms } from "@/lib/teacher/teacher-cms";

export default async function TeacherDashboardPage() {
  const user = await requireTeacher();
  const cms = await getTeacherCms(user.id);

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-slate-950 p-7 text-white sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Teacher workspace</p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Welcome, {cms.displayName}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Create, review and manage chapter-wise learning resources from one dashboard.</p>
        <Link href="/teacher/resources" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950">
          Open resource manager <ArrowRight size={17} />
        </Link>
      </section>

      {!cms.teacherProfile ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Your account has teacher access but no TeacherProfile yet. Run the included role setup script once to create it.
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<FileText size={20} />} label="Total resources" value={cms.totals.resources} />
        <StatCard icon={<BookOpenCheck size={20} />} label="Published" value={cms.totals.published} />
        <StatCard icon={<Clock3 size={20} />} label="Pending review" value={cms.totals.pending} />
        <StatCard icon={<Eye size={20} />} label="Total views" value={cms.totals.views} />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">Recent work</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">Latest resources</h2>
          </div>
          <Link href="/teacher/resources" className="text-sm font-bold text-blue-700">View all</Link>
        </div>
        <div className="mt-6 divide-y divide-slate-100">
          {cms.resources.slice(0, 5).map((resource) => (
            <div key={resource.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-950">{resource.title}</p>
                <p className="mt-1 text-xs text-slate-500">{resource.resourceType.name} · {resource.status.replaceAll("_", " ")}</p>
              </div>
              <Link href={`/teacher/resources/${resource.id}/edit`} className="text-sm font-semibold text-blue-700">Edit</Link>
            </div>
          ))}
          {cms.resources.length === 0 ? <p className="py-8 text-sm text-slate-500">No resources created yet.</p> : null}
        </div>
      </section>
    </main>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">{icon}</div><p className="mt-4 text-3xl font-bold text-slate-950">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>;
}
