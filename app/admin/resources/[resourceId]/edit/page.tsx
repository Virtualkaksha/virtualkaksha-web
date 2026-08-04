import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { requireCurrentRole } from "@/lib/auth/current-identity";
import { canAdminEditResourceMapping, canAdminEditResourceMetadata } from "@/lib/admin/resource-metadata-policy";
import { findAdminResourceMetadata, findAdminResourceMetadataOptions } from "@/repositories/admin-resource-metadata.repository";
import { updateAdminResourceMetadataAction } from "../../metadata-actions";

const field = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100";
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="space-y-2 text-sm font-semibold text-slate-700"><span>{label}</span>{children}</label>; }

export default async function AdminResourceMetadataEditPage({ params, searchParams }: { params: Promise<{ resourceId: string }>; searchParams: Promise<{ error?: string; updated?: string; unchanged?: string; rateLimited?: string; retryAfter?: string }> }) {
  await requireCurrentRole("ADMIN");
  const [{ resourceId }, notice] = await Promise.all([params, searchParams]);
  const [resource, options] = await Promise.all([findAdminResourceMetadata(resourceId), findAdminResourceMetadataOptions()]);
  if (!resource) notFound();
  const editable = canAdminEditResourceMetadata(resource.status);
  const mappingEditable = canAdminEditResourceMapping(resource.status);
  const primaryAsset = resource.assets[0] ?? null;
  const legacy = resource.legacySource;
  const assetSource = resource.assetSource === "NATIVE" ? "Native asset" : legacy ? "Legacy PDF source" : resource.assetSource === "EXTERNAL" ? "External source" : "No native asset";

  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
    <div className="flex flex-wrap gap-4 text-sm font-semibold"><Link href="/admin/resources/inventory" className="text-blue-700">← Resource inventory</Link><Link href={`/admin/resources/${resource.id}`} className="text-blue-700">Moderation and preview</Link></div>
    <header><p className="text-sm font-semibold text-blue-700">ADMIN metadata editor</p><h1 className="mt-1 text-3xl font-bold text-slate-950">{resource.title}</h1><p className="mt-2 text-slate-600">Version {resource.version} · {resource.status.replaceAll("_", " ")}</p></header>
    {resource.status === "PUBLISHED" && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 font-medium text-amber-900">Saving metadata changes will return this resource to review and temporarily remove it from student and public access.</div>}
    {legacy && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">This resource uses a legacy PDF source. Stage B does not replace or migrate the PDF.</div>}
    {notice.error && <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-900">{notice.error}</div>}
    {notice.updated === "true" && <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">Metadata and audit history were saved.</div>}
    {notice.unchanged === "true" && <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-blue-900">No metadata changed; the version and audit history were left unchanged.</div>}
    {notice.rateLimited === "true" && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">Too many requests. Retry in about {notice.retryAfter ?? "a few"} seconds.</div>}
    <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
      <div><p className="text-xs uppercase text-slate-500">Asset</p><p className="font-semibold">{assetSource} · {primaryAsset?.status ?? "MISSING"}</p></div>
      <div><p className="text-xs uppercase text-slate-500">Engagement</p><p className="font-semibold">{resource._count.bookmarks} bookmarks · {resource._count.progress} progress records</p></div>
      <div><p className="text-xs uppercase text-slate-500">Immutable file data</p><p className="font-semibold">{resource.format} · {resource.pageCount ?? "—"} pages · {resource.fileSizeBytes?.toString() ?? "—"} bytes</p></div>
      <div className="sm:col-span-3"><p className="text-xs uppercase text-slate-500">Stable slug</p><code className="select-all text-sm">{resource.slug}</code></div>
    </section>
    {!editable ? <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><h2 className="font-bold">Archived resources are read-only</h2><p className="mt-2 text-sm text-slate-600">Restore must be a separate authorized action.</p></section> :
    <form action={updateAdminResourceMetadataAction} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <input type="hidden" name="resourceId" value={resource.id}/><input type="hidden" name="expectedVersion" value={resource.version}/>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Title"><input name="title" required minLength={3} maxLength={200} defaultValue={resource.title} className={field}/></Field><Field label="Hindi title"><input name="titleHindi" maxLength={200} defaultValue={resource.titleHindi ?? ""} className={field}/></Field></div>
      <Field label="Description"><textarea name="description" maxLength={4000} rows={6} defaultValue={resource.description ?? ""} className={`${field} py-3`}/></Field>
      <div className="grid gap-4 sm:grid-cols-3"><Field label="Resource type"><select name="resourceTypeId" defaultValue={resource.resourceTypeId} className={field}>{options.resourceTypes.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field label="Language"><select name="language" defaultValue={resource.language} className={field}><option>ENGLISH</option><option>HINDI</option></select></Field><Field label="Access"><select name="access" defaultValue={resource.access} className={field}><option>FREE</option><option>PREMIUM</option><option>ENROLLED_ONLY</option></select></Field></div>
      {mappingEditable ? <div className="grid gap-4 sm:grid-cols-2"><Field label="Chapter (choose exactly one mapping)"><select name="chapterId" defaultValue={resource.chapterId ?? ""} className={field}><option value="">No chapter</option>{options.chapters.map((x)=><option key={x.id} value={x.id}>{x.boardClassSubject.board.shortName} · {x.boardClassSubject.classLevel.name} · {x.boardClassSubject.subject.name} · {x.name}</option>)}</select></Field><Field label="Exam topic"><select name="examTopicId" defaultValue={resource.examTopicId ?? ""} className={field}><option value="">No exam topic</option>{options.examTopics.map((x)=><option key={x.id} value={x.id}>{x.examSubject.exam.shortName} · {x.examSubject.subject.name} · {x.name}</option>)}</select></Field></div> : <><input type="hidden" name="chapterId" value={resource.chapterId ?? ""}/><input type="hidden" name="examTopicId" value={resource.examTopicId ?? ""}/><p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">Academic mapping is locked for published resources to preserve route stability.</p></>}
      <Field label="Reason for change"><textarea name="reason" required minLength={10} maxLength={1000} rows={3} className={`${field} py-3`} placeholder="Explain why this metadata correction is needed."/></Field>
      <p className="text-sm text-slate-600">PDF replacement, source URL changes, thumbnails, page counts, slugs, ownership and asset metadata are unavailable in this editor.</p>
      <button className="min-h-12 rounded-xl bg-blue-700 px-6 font-bold text-white">Save metadata correction</button>
    </form>}
  </main>;
}
