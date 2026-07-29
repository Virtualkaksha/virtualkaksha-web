import Link from "next/link";
import { notFound } from "next/navigation";

import { requireTeacher } from "@/lib/auth/session";
import { getTeacherManagedResource, validExternalHttpUrl } from "@/lib/teacher/resource-management";
import { archiveTeacherResource, resubmitTeacherResource, submitTeacherResource, unpublishTeacherResource } from "../actions";

type Props = { params: Promise<{ resourceId: string }>; searchParams: Promise<{ updated?: string; error?: string }> };

export default async function TeacherResourceDetailPage({ params, searchParams }: Props) {
  const user = await requireTeacher();
  const { resourceId } = await params;
  const resource = await getTeacherManagedResource(user, resourceId);
  if (!resource) notFound();
  const query = await searchParams;
  const externalPdfUrl = resource.format === "PDF" ? validExternalHttpUrl(resource.externalUrl) : null;

  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <Link href="/teacher/resources" className="text-sm font-semibold text-blue-700">← My Resources</Link>
    {query.updated === "true" ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Resource updated successfully.</p> : null}
    {query.error ? <p className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">This resource cannot be edited in its current state.</p> : null}
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-blue-700">{resource.status.replaceAll("_", " ")}</p><h1 className="mt-2 text-3xl font-bold text-slate-950">{resource.title}</h1>{resource.titleHindi ? <p className="mt-2 text-lg text-slate-600">{resource.titleHindi}</p> : null}</div><div className="flex flex-wrap gap-2">{resource.actions.includes("EDIT") ? <Link href={`/teacher/resources/${resource.id}/edit`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Edit</Link> : null}<StatusActions resourceId={resource.id} actions={resource.actions}/></div></div>
      {resource.description ? <p className="mt-6 leading-7 text-slate-600">{resource.description}</p> : null}
      {resource.moderationNote ? <p className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Moderation note: {resource.moderationNote}</p> : null}
      <dl className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[
        ["Format", resource.format], ["Access", resource.access], ["Language", resource.language], ["Academic path", resource.academicLabel], ["Resource type", resource.resourceType.name], ["PDF asset", resource.assetState ?? "Not applicable"], ["Created", resource.createdAt.toLocaleString()], ["Updated", resource.updatedAt.toLocaleString()], [resource.format === "VIDEO" ? "Duration" : "Pages", resource.format === "VIDEO" && resource.durationSeconds ? `${Math.ceil(resource.durationSeconds / 60)} minutes` : resource.pageCount?.toString() ?? "Not specified"],
      ].map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-2 text-sm font-semibold text-slate-900">{value}</dd></div>)}</dl>
      <div className="mt-7">{resource.format === "PDF" && resource.assetState === "READY" ? <Link href={`/api/teacher/resources/${resource.id}/asset`} target="_blank" className="inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Preview PDF</Link> : externalPdfUrl ? <a href={externalPdfUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Open external PDF</a> : resource.format === "PDF" ? <p className="text-sm text-amber-700">Native PDF preview is unavailable while the asset is {resource.assetState ?? "not ready"}.</p> : null}</div>
    </section>
  </main>;
}

function StatusActions({ resourceId, actions }: { resourceId: string; actions: readonly string[] }) {
  const forms = [
    ["SUBMIT", "Submit", submitTeacherResource], ["RESUBMIT", "Resubmit", resubmitTeacherResource], ["UNPUBLISH", "Unpublish", unpublishTeacherResource], ["ARCHIVE", "Archive", archiveTeacherResource],
  ] as const;
  return <>{forms.filter(([key]) => actions.includes(key)).map(([key, label, action]) => <form action={action} key={key}><input type="hidden" name="resourceId" value={resourceId}/><button type="submit" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">{label}</button></form>)}</>;
}
