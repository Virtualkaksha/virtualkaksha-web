import Link from "next/link";
import { notFound } from "next/navigation";

import { getModerationResource } from "@/lib/admin/moderation";
import { approveResource, archiveResource, rejectResource } from "../actions";

export default async function AdminResourceReviewPage({ params, searchParams }: { params: Promise<{ resourceId: string }>; searchParams: Promise<{ approved?: string; rejected?: string }> }) {
  const { resourceId } = await params; const notice = await searchParams; const item = await getModerationResource(resourceId); if (!item) notFound();
  const source = item.contentUrl ?? item.externalUrl;
  return <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
    <Link href="/admin/resources" className="text-sm font-semibold text-blue-700">← Back to moderation queue</Link>
    {(notice.approved === "true" || notice.rejected === "true") && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Moderation decision saved successfully.</div>}
    <section className="rounded-3xl bg-slate-950 p-7 text-white sm:p-9"><div className="flex flex-col justify-between gap-5 md:flex-row"><div><p className="text-sm font-semibold uppercase tracking-[.16em] text-blue-300">{item.resourceType.name} · {item.format}</p><h1 className="mt-3 text-3xl font-bold">{item.title}</h1><p className="mt-3 max-w-3xl text-slate-300">{item.description ?? "No description provided."}</p></div><span className="h-fit rounded-full bg-white/10 px-4 py-2 text-xs font-semibold">{item.status.replaceAll("_", " ")}</span></div></section>
    <div className="grid gap-6 lg:grid-cols-[1.5fr_.8fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold text-slate-950">Resource preview</h2><div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        {item.format === "ARTICLE" ? <article className="whitespace-pre-wrap p-6 leading-7 text-slate-700">{item.textContent}</article> : source ? <iframe title={item.title} src={source} className="h-[620px] w-full" /> : <div className="p-12 text-center text-slate-500">No previewable content URL supplied.</div>}
      </div>{source && <a href={source} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-semibold text-blue-700">Open source in a new tab ↗</a>}</section>
      <aside className="space-y-5"><section className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="font-bold text-slate-950">Submission details</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-slate-500">Teacher</dt><dd className="font-medium text-slate-900">{item.creatorName}</dd><dd className="text-slate-500">{item.createdBy?.email}</dd></div><div><dt className="text-slate-500">Location</dt><dd className="font-medium text-slate-900">{item.chapter ? `${item.chapter.boardClassSubject.board.shortName} · ${item.chapter.boardClassSubject.classLevel.name} · ${item.chapter.boardClassSubject.subject.name} · ${item.chapter.name}` : "Competitive catalogue"}</dd></div><div><dt className="text-slate-500">Access</dt><dd className="font-medium text-slate-900">{item.access}</dd></div></dl></section>
        {item.moderationNote && <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6"><h2 className="font-bold text-rose-900">Moderation note</h2><p className="mt-2 text-sm leading-6 text-rose-800">{item.moderationNote}</p></section>}
        <section className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="font-bold text-slate-950">Decision</h2><form action={approveResource} className="mt-4"><input type="hidden" name="resourceId" value={item.id}/><button className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 font-semibold text-white">Approve and publish</button></form><form action={rejectResource} className="mt-4 space-y-3"><input type="hidden" name="resourceId" value={item.id}/><textarea name="reason" required minLength={10} placeholder="Explain what the teacher must correct..." className="min-h-28 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-rose-500"/><button className="min-h-11 w-full rounded-xl bg-rose-600 px-4 font-semibold text-white">Reject with reason</button></form><form action={archiveResource} className="mt-3"><input type="hidden" name="resourceId" value={item.id}/><button className="min-h-11 w-full rounded-xl border border-slate-300 px-4 font-semibold text-slate-700">Archive resource</button></form></section>
      </aside>
    </div>
  </main>;
}
