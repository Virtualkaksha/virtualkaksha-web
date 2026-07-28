import Link from "next/link";
import { Archive, Pencil, PlusCircle } from "lucide-react";

import { requireTeacher } from "@/lib/auth/session";
import { getTeacherCms } from "@/lib/teacher/teacher-cms";
import { archiveTeacherResource, createTeacherResource } from "./actions";
import ResourceCreateForm from "./ResourceCreateForm";

type Props = { searchParams: Promise<{ created?: string; error?: string }> };

export default async function TeacherResourcesPage({ searchParams }: Props) {
  const user = await requireTeacher();
  const cms = await getTeacherCms(user.id);
  const { created, error } = await searchParams;

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-semibold text-blue-700">Teacher CMS</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Resource manager</h1><p className="mt-2 text-sm text-slate-600">Create chapter-wise learning resources and send them through the publishing workflow.</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600"><strong className="text-slate-950">{cms.resources.length}</strong> active resources</div>
      </header>
      {created === "true" ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Resource saved successfully.</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</div> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3"><PlusCircle className="text-blue-700"/><div><h2 className="text-2xl font-bold text-slate-950">Add resource</h2><p className="mt-1 text-sm text-slate-500">Choose the learning path first, then add content and publishing details.</p></div></div>
        <ResourceCreateForm chapters={cms.chapters} resourceTypes={cms.resourceTypes} canPublish={user.roles.includes("ADMIN")} action={createTeacherResource}/>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-blue-700">Library</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Your resources</h2></div></div>
        <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Resource</th><th className="px-3 py-3">Chapter</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Views</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{cms.resources.map((r) => <tr key={r.id}><td className="px-3 py-4"><p className="font-semibold text-slate-950">{r.title}</p><p className="mt-1 text-xs text-slate-500">{r.resourceType.name} · {r.format.replaceAll("_", " ")}</p></td><td className="px-3 py-4 text-slate-600">{r.chapter ? `${r.chapter.boardClassSubject.board.shortName} · ${r.chapter.boardClassSubject.classLevel.name} · ${r.chapter.boardClassSubject.subject.name} · ${r.chapter.name}` : "Exam resource"}</td><td className="px-3 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{r.status.replaceAll("_", " ")}</span>{r.moderationNote ? <p className="mt-2 max-w-xs text-xs leading-5 text-rose-600">{r.moderationNote}</p> : null}</td><td className="px-3 py-4 text-slate-600">{r.viewCount}</td><td className="px-3 py-4"><div className="flex justify-end gap-2"><Link href={`/teacher/resources/${r.id}/edit`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"><Pencil size={15}/> Edit</Link><form action={archiveTeacherResource}><input type="hidden" name="resourceId" value={r.id}/><button className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 font-semibold text-rose-700 hover:bg-rose-50"><Archive size={15}/> Archive</button></form></div></td></tr>)}{cms.resources.length === 0 ? <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-500">No resources yet. Create your first resource above.</td></tr> : null}</tbody></table></div>
      </section>
    </main>
  );
}
