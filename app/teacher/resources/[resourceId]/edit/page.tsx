import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAnyCurrentRole } from "@/lib/auth/current-identity";
import { findEditableTeacherManagedResource, findTeacherResourceEditOptions } from "@/repositories/teacher-resource.repository";
import { updateTeacherResource } from "../../actions";

type Props = { params: Promise<{ resourceId: string }>; searchParams: Promise<{ error?: string }> };
const field = "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500";

export default async function EditTeacherResourcePage({ params, searchParams }: Props) {
  const user = await requireAnyCurrentRole(["TEACHER", "ADMIN"]);
  const { resourceId } = await params;
  const [resource, options] = await Promise.all([
    findEditableTeacherManagedResource(resourceId, user.id),
    findTeacherResourceEditOptions(),
  ]);
  if (!resource) redirect(`/teacher/resources/${resourceId}?error=not-editable`);
  const query = await searchParams;
  const currentMapping = resource.chapterId ? `CHAPTER:${resource.chapterId}` : `EXAM_TOPIC:${resource.examTopicId}`;

  return <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <Link href={`/teacher/resources/${resource.id}`} className="text-sm font-semibold text-blue-700">← Resource details</Link>
    <header className="mt-5"><p className="text-sm font-semibold text-blue-700">{resource.status.replaceAll("_", " ")}</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Edit metadata</h1><p className="mt-2 text-sm text-slate-600">The format, source, slug, ownership and native PDF asset remain unchanged.</p></header>
    {query.error ? <p className="mt-5 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-800">{query.error}</p> : null}
    <form action={updateTeacherResource} className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <input type="hidden" name="resourceId" value={resource.id}/>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Title"><input name="title" required defaultValue={resource.title} className={field}/></Field>
        <Field label="Hindi title"><input name="titleHindi" defaultValue={resource.titleHindi ?? ""} className={field}/></Field>
      </div>
      <Field label="Description"><textarea name="description" rows={5} defaultValue={resource.description ?? ""} className={`${field} py-3`}/></Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Resource type"><select name="resourceTypeId" required defaultValue={resource.resourceTypeId} className={field}>{options.resourceTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Academic mapping"><select name="mapping" required defaultValue={currentMapping} className={field}><optgroup label="Board chapters">{options.chapters.map((item) => <option key={item.id} value={`CHAPTER:${item.id}`}>{item.boardClassSubject.board.shortName} · {item.boardClassSubject.classLevel.name} · {item.boardClassSubject.subject.name} · {item.name}</option>)}</optgroup><optgroup label="Exam topics">{options.examTopics.map((item) => <option key={item.id} value={`EXAM_TOPIC:${item.id}`}>{item.examSubject.exam.shortName} · {item.examSubject.subject.name} · {item.name}</option>)}</optgroup></select></Field>
        <Field label="Language"><select name="language" defaultValue={resource.language} className={field}><option value="ENGLISH">English</option><option value="HINDI">Hindi</option></select></Field>
        <Field label="Access"><select name="access" defaultValue={resource.access} className={field}><option value="FREE">Free</option><option value="PREMIUM">Premium</option><option value="ENROLLED_ONLY">Enrolled only</option></select></Field>
        <Field label="Thumbnail URL"><input name="thumbnailUrl" type="url" defaultValue={resource.thumbnailUrl ?? ""} className={field}/></Field>
        {resource.format === "PDF" ? <Field label="Page count"><input name="pageCount" type="number" min="0" defaultValue={resource.pageCount ?? ""} className={field}/></Field> : null}
        {resource.format === "VIDEO" ? <Field label="Duration in minutes"><input name="durationMinutes" type="number" min="0" defaultValue={resource.durationSeconds ? Math.ceil(resource.durationSeconds / 60) : ""} className={field}/></Field> : null}
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5"><Link href={`/teacher/resources/${resource.id}`} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold">Cancel</Link><button type="submit" className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white">Save metadata</button></div>
    </form>
  </main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-semibold text-slate-700">{label}</span>{children}</label>;
}
