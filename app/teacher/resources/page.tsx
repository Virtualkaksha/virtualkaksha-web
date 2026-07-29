import Link from "next/link";
import { Archive, Pencil, PlusCircle } from "lucide-react";

import { requireTeacher } from "@/lib/auth/session";
import { getTeacherCms } from "@/lib/teacher/teacher-cms";
import { buildResourceSearchUrl, getAcademicUnitOptions, parseTeacherSearchQuery, type RawSearchParams } from "@/lib/resources/resource-search-query";
import { archiveTeacherResource, createTeacherResource } from "./actions";
import ResourceCreateForm from "./ResourceCreateForm";

type Props = { searchParams: Promise<RawSearchParams> };
const field = "min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500";

export default async function TeacherResourcesPage({ searchParams }: Props) {
  const user = await requireTeacher();
  const rawParams = await searchParams;
  const query = parseTeacherSearchQuery(rawParams);
  const cms = await getTeacherCms(user.id, query);
  const { page, totalPages, total } = cms.search.pagination;
  const created = typeof rawParams.created === "string" ? rawParams.created : undefined;
  const error = typeof rawParams.error === "string" ? rawParams.error : undefined;
  const academicUnits = getAcademicUnitOptions(query, cms.facets);

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-semibold text-blue-700">Teacher CMS</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Resource manager</h1><p className="mt-2 text-sm text-slate-600">Create chapter-wise learning resources and manage your own library.</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600"><strong className="text-slate-950">{total}</strong> matching resources</div>
      </header>
      {created === "true" ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Resource saved successfully.</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</div> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3"><PlusCircle className="text-blue-700"/><div><h2 className="text-2xl font-bold text-slate-950">Add resource</h2><p className="mt-1 text-sm text-slate-500">Choose the learning path first, then add content and publishing details.</p></div></div>
        <ResourceCreateForm chapters={cms.chapters} resourceTypes={cms.resourceTypes} canPublish={user.roles.includes("ADMIN")} action={createTeacherResource}/>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div><p className="text-sm font-semibold text-blue-700">Library</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Your resources</h2></div>
        <form method="get" className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input name="q" defaultValue={query.q} placeholder="Search title, chapter, subject or teacher" className={`${field} md:col-span-2 xl:col-span-4`} />
          <select name="status" defaultValue={query.status} className={field}>{["ALL", "DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "ARCHIVED"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>
          <select name="trackType" defaultValue={query.trackType ?? ""} className={field}><option value="">All track types</option><option value="BOARD">School board</option><option value="EXAM">Competitive exam</option></select>
          <select name="track" defaultValue={query.track} className={field}><option value="">All tracks</option><optgroup label="Boards">{cms.facets.boards.map((item) => <option key={`b-${item.slug}`} value={item.slug}>{item.shortName}</option>)}</optgroup><optgroup label="Exams">{cms.facets.exams.map((item) => <option key={`e-${item.slug}`} value={item.slug}>{item.shortName}</option>)}</optgroup></select>
          <select name="level" defaultValue={query.level} className={field}><option value="">All classes</option>{cms.facets.levels.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select>
          <select name="subject" defaultValue={query.subject} className={field}><option value="">All subjects</option>{cms.facets.subjects.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select>
          <select name="chapter" defaultValue={query.chapter} className={field}><option value="">All {academicUnits.label.toLowerCase()}s</option>{academicUnits.options.map((item, index) => <option key={`${item.slug}-${index}`} value={item.slug}>{item.name}</option>)}</select>
          <select name="type" defaultValue={query.type} className={field}><option value="">All resource types</option>{cms.facets.resourceTypes.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select>
          <select name="sort" defaultValue={query.sort} className={field}><option value="relevance">Curated order</option><option value="newest">Newest</option><option value="alphabetical">Alphabetical</option></select>
          <div className="flex gap-2 md:col-span-2 xl:col-span-4"><button className="rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white">Apply filters</button><Link href="/teacher/resources" className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700">Clear</Link></div>
        </form>

        <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Resource</th><th className="px-3 py-3">Academic mapping</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Views</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{cms.search.items.map((r) => <tr key={r.id}><td className="px-3 py-4"><p className="font-semibold text-slate-950">{r.title}</p><p className="mt-1 text-xs text-slate-500">{r.resourceType.name} · {r.format.replaceAll("_", " ")}</p></td><td className="px-3 py-4 text-slate-600">{r.academicLabel}</td><td className="px-3 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{r.status.replaceAll("_", " ")}</span>{r.moderationNote ? <p className="mt-2 max-w-xs text-xs leading-5 text-rose-600">{r.moderationNote}</p> : null}</td><td className="px-3 py-4 text-slate-600">{r.viewCount}</td><td className="px-3 py-4"><div className="flex justify-end gap-2"><Link href={`/teacher/resources/${r.id}/edit`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"><Pencil size={15}/> Edit</Link>{r.status !== "ARCHIVED" ? <form action={archiveTeacherResource}><input type="hidden" name="resourceId" value={r.id}/><button className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 font-semibold text-rose-700 hover:bg-rose-50"><Archive size={15}/> Archive</button></form> : null}</div></td></tr>)}{cms.search.items.length === 0 ? <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-500">No resources match these filters.</td></tr> : null}</tbody></table></div>

        {totalPages > 1 ? <nav className="mt-5 flex justify-center gap-3" aria-label="Teacher resource pages">{page > 1 ? <Link href={buildResourceSearchUrl("/teacher/resources", query, page - 1)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Previous</Link> : null}{page < totalPages ? <Link href={buildResourceSearchUrl("/teacher/resources", query, page + 1)} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Next</Link> : null}</nav> : null}
      </section>
    </main>
  );
}
