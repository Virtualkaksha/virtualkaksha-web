import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Inbox,
  MessageSquareWarning,
} from "lucide-react";

import { requireCurrentRole } from "@/lib/auth/current-identity";
import { getTeacherInboxCms } from "@/lib/teacher/teacher-cms";

type InboxItem = Awaited<ReturnType<typeof getTeacherInboxCms>>["rejected"][number];

export default async function TeacherInboxPage() {
  const user = await requireCurrentRole("TEACHER");
  const inbox = await getTeacherInboxCms(user.id);

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">Status inbox</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Review updates</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            See rejected resources with admin reasons, items waiting for review, and recently approved
            publications — all in one place.
          </p>
        </div>
        <Link
          href="/teacher/resources/new"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-bold text-white"
        >
          Add resource
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          href="/teacher/inbox#rejected"
          label="Needs fix"
          value={inbox.counts.rejected}
          tone="rose"
          icon={<MessageSquareWarning size={18} />}
        />
        <SummaryCard
          href="/teacher/inbox#pending"
          label="Waiting for review"
          value={inbox.counts.pending}
          tone="amber"
          icon={<Clock3 size={18} />}
        />
        <SummaryCard
          href="/teacher/inbox#approved"
          label="Recently approved"
          value={inbox.recentlyPublished.length}
          tone="emerald"
          icon={<CheckCircle2 size={18} />}
        />
      </section>

      <InboxSection
        id="rejected"
        title="Rejected — action required"
        empty="No rejected resources. Great work."
        items={inbox.rejected}
        tone="rose"
        actionLabel="Fix & resubmit"
      />

      <InboxSection
        id="pending"
        title="Pending admin review"
        empty="Nothing waiting for review right now."
        items={inbox.pending}
        tone="amber"
        actionLabel="View submission"
      />

      <InboxSection
        id="approved"
        title="Recently approved (last 14 days)"
        empty="No newly approved resources in the last two weeks."
        items={inbox.recentlyPublished}
        tone="emerald"
        actionLabel="Open resource"
      />
    </main>
  );
}

function SummaryCard({
  href,
  label,
  value,
  tone,
  icon,
}: {
  href: string;
  label: string;
  value: number;
  tone: "rose" | "amber" | "emerald";
  icon: React.ReactNode;
}) {
  const tones = {
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  } as const;
  return (
    <Link href={href} className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </Link>
  );
}

function InboxSection({
  id,
  title,
  empty,
  items,
  tone,
  actionLabel,
}: {
  id: string;
  title: string;
  empty: string;
  items: InboxItem[];
  tone: "rose" | "amber" | "emerald";
  actionLabel: string;
}) {
  const badge = {
    rose: "bg-rose-100 text-rose-800",
    amber: "bg-amber-100 text-amber-900",
    emerald: "bg-emerald-100 text-emerald-900",
  } as const;

  return (
    <section id={id} className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <Inbox size={18} className="text-blue-700" />
        <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
      </div>

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="mt-6 divide-y divide-slate-100">
          {items.map((item) => (
            <article key={item.id} className="flex flex-col gap-4 py-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-950">{item.title}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge[tone]}`}>
                    {item.status.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {item.resourceTypeName} · {item.academicLabel}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Updated {item.updatedAt.toLocaleString()}
                  {item.publishedAt ? ` · Published ${item.publishedAt.toLocaleDateString()}` : ""}
                </p>
                {item.moderationNote ? (
                  <div className="mt-3 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-900">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">Admin feedback</p>
                      <p className="mt-1 leading-6">{item.moderationNote}</p>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  href={`/teacher/resources/${item.id}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  {actionLabel} <ArrowRight size={15} />
                </Link>
                {item.status === "REJECTED" ? (
                  <Link
                    href={`/teacher/resources/${item.id}/edit`}
                    className="inline-flex min-h-10 items-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white"
                  >
                    Edit now
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
