import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminModerationActions } from "@/lib/admin/resource-moderation-policy";
import { getModerationResource } from "@/lib/admin/moderation";
import { resolveAdminResourcePreview } from "@/lib/admin/resource-preview";
import { approveResource, archiveResource, rejectResource } from "../actions";

export default async function AdminResourceReviewPage({ params, searchParams }: { params: Promise<{ resourceId: string }>; searchParams: Promise<{ approved?: string; rejected?: string }> }) {
  const { resourceId } = await params; const notice = await searchParams; const item = await getModerationResource(resourceId); if (!item) notFound();
  const preview = resolveAdminResourcePreview(item);
  const actions = getAdminModerationActions(item.status);
  return <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
    <Link href="/admin/resources" className="text-sm font-semibold text-blue-700">← Back to moderation queue</Link>
    {(notice.approved === "true" || notice.rejected === "true") && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Moderation decision saved successfully.</div>}
    <section className="rounded-3xl bg-slate-950 p-7 text-white sm:p-9"><div className="flex flex-col justify-between gap-5 md:flex-row"><div><p className="text-sm font-semibold uppercase tracking-[.16em] text-blue-300">{item.resourceType.name} · {item.format}</p><h1 className="mt-3 text-3xl font-bold">{item.title}</h1><p className="mt-3 max-w-3xl text-slate-300">{item.description ?? "No description provided."}</p></div><span className="h-fit rounded-full bg-white/10 px-4 py-2 text-xs font-semibold">{item.status.replaceAll("_", " ")}</span></div></section>
    <div className="grid gap-6 lg:grid-cols-[1.5fr_.8fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold text-slate-950">Resource preview</h2><div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        {preview.kind === "article" && <article className="whitespace-pre-wrap p-6 leading-7 text-slate-700">{item.textContent}</article>}
        {preview.kind === "native-pdf" && <iframe title={`${item.title} PDF preview`} src={preview.url} className="h-[620px] w-full" />}
        {preview.kind === "external" && <iframe title={`${item.title} external preview`} src={preview.url} sandbox="" referrerPolicy="no-referrer" className="h-[620px] w-full" />}
        {preview.kind === "native-pdf-unavailable" && <div className="p-12 text-center text-slate-600">Native PDF preview is unavailable because the primary asset is {preview.status.replaceAll("_", " ").toLowerCase()}.</div>}
        {preview.kind === "unavailable" && <div className="p-12 text-center text-slate-500">No safe preview is available for this resource.</div>}
      </div>
      {preview.kind === "native-pdf" && <a href={preview.url} target="_blank" rel="noreferrer noopener" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white">Preview PDF ↗</a>}
      {preview.kind === "external" && <a href={preview.url} target="_blank" rel="noreferrer noopener" referrerPolicy="no-referrer" className="mt-4 inline-block text-sm font-semibold text-blue-700">Open external source in a new tab ↗</a>}
      </section>
      <aside className="space-y-5"><section className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="font-bold text-slate-950">Submission details</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-slate-500">Teacher</dt><dd className="font-medium text-slate-900">{item.creatorName}</dd><dd className="text-slate-500">{item.createdBy?.email}</dd></div><div><dt className="text-slate-500">Location</dt><dd className="font-medium text-slate-900">{item.chapter ? `${item.chapter.boardClassSubject.board.shortName} · ${item.chapter.boardClassSubject.classLevel.name} · ${item.chapter.boardClassSubject.subject.name} · ${item.chapter.name}` : "Competitive catalogue"}</dd></div><div><dt className="text-slate-500">Access</dt><dd className="font-medium text-slate-900">{item.access}</dd></div></dl></section>
        {item.moderationNote && <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6"><h2 className="font-bold text-rose-900">Moderation note</h2><p className="mt-2 text-sm leading-6 text-rose-800">{item.moderationNote}</p></section>}
        <section className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="font-bold text-slate-950">Decision</h2>
          {actions.includes("APPROVE") && <form action={approveResource} className="mt-4"><input type="hidden" name="resourceId" value={item.id}/><button className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 font-semibold text-white">Approve and publish</button></form>}
          {actions.includes("REJECT") && <form action={rejectResource} className="mt-4 space-y-3"><input type="hidden" name="resourceId" value={item.id}/><textarea name="reason" required minLength={10} placeholder="Explain what the teacher must correct..." className="min-h-28 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-rose-500"/><button className="min-h-11 w-full rounded-xl bg-rose-600 px-4 font-semibold text-white">Reject with reason</button></form>}
          {actions.includes("ARCHIVE") && <form action={archiveResource} className="mt-3"><input type="hidden" name="resourceId" value={item.id}/><button className="min-h-11 w-full rounded-xl border border-slate-300 px-4 font-semibold text-slate-700">Archive resource</button></form>}
          {item.status === "ARCHIVED" && <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">This resource is archived and read-only.</p>}
          {actions.length === 0 && item.status !== "ARCHIVED" && <p className="mt-4 text-sm text-slate-600">No moderation actions are available for this resource.</p>}
        </section>
      </aside>
    </div>
  </main>;
}
