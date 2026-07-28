import Link from "next/link";
import { Search } from "lucide-react";

import { getModerationQueue } from "@/lib/admin/moderation";

export default async function AdminResourcesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; archived?: string }> }) {
  const params = await searchParams; const status = params.status ?? "PENDING_REVIEW"; const q = params.q?.trim() ?? "";
  const resources = await getModerationQueue(status, q);
  const statuses = ["PENDING_REVIEW", "PUBLISHED", "REJECTED", "ARCHIVED", "ALL"];
  return (
    <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
      <header><p className="text-sm font-semibold text-blue-700">Resource moderation</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Review queue</h1><p className="mt-2 text-sm text-slate-600">Preview teacher submissions and approve, reject or archive them.</p></header>
      {params.archived === "true" && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Resource archived successfully.</div>}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <form className="flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3.5 text-slate-400" size={18}/><input name="q" defaultValue={q} placeholder="Search title, description or teacher email" className="min-h-11 w-full rounded-xl border border-slate-300 pl-10 pr-4 text-sm outline-none focus:border-blue-500" /></div><input type="hidden" name="status" value={status}/><button className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white">Search</button></form>
        <div className="mt-4 flex flex-wrap gap-2">{statuses.map((item) => <Link key={item} href={`/admin/resources?status=${item}`} className={`rounded-full px-4 py-2 text-xs font-semibold ${status === item ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600"}`}>{item.replaceAll("_", " ")}</Link>)}</div>
      </section>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-4">Resource</th><th className="px-6 py-4">Academic mapping</th><th className="px-6 py-4">Teacher</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Action</th></tr></thead><tbody className="divide-y divide-slate-100">
          {resources.map((item) => <tr key={item.id} className="align-top"><td className="px-6 py-5"><p className="font-semibold text-slate-950">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.resourceType.name} · {item.format}</p></td><td className="px-6 py-5 text-slate-600">{item.chapter ? `${item.chapter.boardClassSubject.board.shortName} · ${item.chapter.boardClassSubject.classLevel.name} · ${item.chapter.boardClassSubject.subject.name} · ${item.chapter.name}` : "Competitive resource"}</td><td className="px-6 py-5"><p className="font-medium text-slate-800">{item.creatorName}</p><p className="mt-1 text-xs text-slate-500">{item.createdBy?.email}</p></td><td className="px-6 py-5"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{item.status.replaceAll("_", " ")}</span>{item.moderationNote && <p className="mt-2 max-w-xs text-xs text-rose-600">{item.moderationNote}</p>}</td><td className="px-6 py-5"><Link href={`/admin/resources/${item.id}`} className="font-semibold text-blue-700">Review →</Link></td></tr>)}
          {!resources.length && <tr><td colSpan={5} className="px-6 py-14 text-center text-slate-500">No resources match this filter.</td></tr>}
        </tbody></table></div>
      </section>
    </main>
  );
}
