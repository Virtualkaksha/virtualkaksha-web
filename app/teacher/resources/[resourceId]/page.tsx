import Link from "next/link";
import { notFound } from "next/navigation";

import { approveResource, rejectResource, unarchiveResource } from "@/app/admin/resources/actions";
import MutationSubmitButton from "@/components/MutationSubmitButton";
import { getAdminModerationActions } from "@/lib/admin/resource-moderation-policy";
import { requireAnyCurrentRole } from "@/lib/auth/current-identity";
import { getTeacherManagedResource, validExternalHttpUrl } from "@/lib/teacher/resource-management";
import { archiveTeacherResource, resubmitTeacherResource, submitTeacherResource, unpublishTeacherResource } from "../actions";

type Props = { params: Promise<{ resourceId: string }>; searchParams: Promise<{ updated?: string; error?: string; retryAfter?: string; published?: string; rejected?: string; restored?: string }> };

export default async function TeacherResourceDetailPage({ params, searchParams }: Props) {
  const user = await requireAnyCurrentRole(["TEACHER", "ADMIN"]);
  const { resourceId } = await params;
  const resource = await getTeacherManagedResource(user, resourceId);
  if (!resource) notFound();
  const query = await searchParams;
  const externalPdfUrl = resource.format === "PDF" ? validExternalHttpUrl(resource.externalUrl) : null;
  const isAdmin = user.roles.includes("ADMIN");
  const adminActions = isAdmin ? getAdminModerationActions(resource.status) : [];

  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <Link href="/teacher/resources" className="text-sm font-semibold text-blue-700">← My Resources</Link>
    {query.published === "true" ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">PDF approved and published. Students can now see this resource.</p> : null}
    {query.restored === "true" ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Resource restored to pending review. You can now approve and publish it.</p> : null}
    {query.rejected === "true" ? <p className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-800">Resource rejected. The teacher can edit and resubmit it.</p> : null}
    {query.updated === "true" ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Resource updated successfully.</p> : null}
    {query.error === "rate-limited" ? <p className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">Too many requests. Please wait before trying again.{query.retryAfter ? ` Retry in about ${query.retryAfter} seconds.` : ""}</p> : query.error ? <p className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">This resource cannot be edited in its current state.</p> : null}
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-700">{resource.status.replaceAll("_", " ")}</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{resource.title}</h1>
          {resource.titleHindi ? <p className="mt-2 text-lg text-slate-600">{resource.titleHindi}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {resource.actions.includes("EDIT") ? <Link href={`/teacher/resources/${resource.id}/edit`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Edit</Link> : null}
          {adminActions.includes("APPROVE") ? (
            <form action={approveResource}>
              <input type="hidden" name="resourceId" value={resource.id} />
              <input type="hidden" name="from" value="teacher" />
              <MutationSubmitButton className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Approve and publish</MutationSubmitButton>
            </form>
          ) : null}
          {adminActions.includes("UNARCHIVE") ? (
            <form action={unarchiveResource}>
              <input type="hidden" name="resourceId" value={resource.id} />
              <input type="hidden" name="from" value="teacher" />
              <MutationSubmitButton className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Unarchive</MutationSubmitButton>
            </form>
          ) : null}
          <StatusActions resourceId={resource.id} actions={resource.actions} />
        </div>
      </div>
      {!isAdmin && resource.status === "PENDING_REVIEW" ? (
        <p className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">This PDF is waiting for an admin to approve and publish it. Students cannot see it until then.</p>
      ) : null}
      {resource.description ? <p className="mt-6 leading-7 text-slate-600">{resource.description}</p> : null}
      {resource.moderationNote ? <p className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Moderation note: {resource.moderationNote}</p> : null}
      <dl className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[
        ["Format", resource.format], ["Access", resource.access], ["Language", resource.language], ["Academic path", resource.academicLabel], ["Resource type", resource.resourceType.name], ["PDF asset", resource.assetState ?? "Not applicable"], ["Created", resource.createdAt.toLocaleString()], ["Updated", resource.updatedAt.toLocaleString()], [resource.format === "VIDEO" ? "Duration" : "Pages", resource.format === "VIDEO" && resource.durationSeconds ? `${Math.ceil(resource.durationSeconds / 60)} minutes` : resource.pageCount?.toString() ?? "Not specified"],
      ].map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-2 text-sm font-semibold text-slate-900">{value}</dd></div>)}</dl>
      <div className="mt-7">{resource.format === "PDF" && resource.assetState === "READY" ? <Link href={`/api/teacher/resources/${resource.id}/asset`} target="_blank" className="inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Preview PDF</Link> : externalPdfUrl ? <a href={externalPdfUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Open external PDF</a> : resource.format === "PDF" ? <p className="text-sm text-amber-700">Native PDF preview is unavailable while the asset is {resource.assetState ?? "not ready"}.</p> : null}</div>
      {adminActions.includes("REJECT") ? (
        <form action={rejectResource} className="mt-6 space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <input type="hidden" name="resourceId" value={resource.id} />
          <input type="hidden" name="from" value="teacher" />
          <p className="text-sm font-semibold text-rose-900">Reject this submission</p>
          <textarea name="reason" required minLength={10} placeholder="Explain what must be corrected before this PDF can be published..." className="min-h-24 w-full rounded-xl border border-rose-200 bg-white p-3 text-sm outline-none focus:border-rose-500" />
          <MutationSubmitButton className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Reject with reason</MutationSubmitButton>
        </form>
      ) : null}
    </section>
  </main>;
}

function StatusActions({ resourceId, actions }: { resourceId: string; actions: readonly string[] }) {
  const forms = [
    ["SUBMIT", "Submit", submitTeacherResource], ["RESUBMIT", "Resubmit", resubmitTeacherResource], ["UNPUBLISH", "Unpublish", unpublishTeacherResource], ["ARCHIVE", "Archive", archiveTeacherResource],
  ] as const;
  return <>{forms.filter(([key]) => actions.includes(key)).map(([key, label, action]) => <form action={action} key={key}><input type="hidden" name="resourceId" value={resourceId}/><MutationSubmitButton className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">{label}</MutationSubmitButton></form>)}</>;
}
