import Link from "next/link";

import StudentResourceCard from "@/components/student/StudentResourceCard";
import { requireStudent } from "@/lib/auth/session";
import { getStudentBookmarks } from "@/lib/resources/student-learning";
import { parseStudentLearningQuery, type StudentLearningSearchParams } from "@/lib/resources/student-learning-query";

export default async function StudentBookmarksPage({
  searchParams,
}: {
  searchParams: Promise<StudentLearningSearchParams>;
}) {
  const user = await requireStudent();
  const query = parseStudentLearningQuery(await searchParams);
  const result = await getStudentBookmarks(user.id, query);

  if (!result) {
    return <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-white px-6 py-12 text-center"><h1 className="text-2xl font-bold text-slate-900">Student profile required</h1><p className="mt-3 text-sm text-slate-600">Complete your student profile before saving resources.</p></section>;
  }

  const { page, totalPages, total } = result.pagination;
  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Saved for revision</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Your bookmarks</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Return to the resources you saved, newest first.</p>
      </header>
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="font-semibold text-slate-700">{total} {total === 1 ? "bookmark" : "bookmarks"}</p>
        <p className="text-slate-500">Page {page} of {totalPages}</p>
      </div>
      {result.items.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {result.items.map((item) => <StudentResourceCard key={item.id} item={item} bookmarked />)}
        </div>
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-xl font-bold text-slate-900">No bookmarks yet</h2>
          <p className="mt-2 text-sm text-slate-600">Save useful resources from search or the resource viewer.</p>
          <Link href="/student/resources/search" className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white">Search resources</Link>
        </section>
      )}
      {totalPages > 1 ? <nav aria-label="Bookmark pages" className="flex justify-center gap-3">{page > 1 ? <Link href={`/student/bookmarks?page=${page - 1}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Previous</Link> : null}{page < totalPages ? <Link href={`/student/bookmarks?page=${page + 1}`} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Next</Link> : null}</nav> : null}
    </div>
  );
}
