import Link from "next/link";

import StudentResourceCard from "@/components/student/StudentResourceCard";
import { requireStudent } from "@/lib/auth/session";
import { getStudentContinueLearning } from "@/lib/resources/student-learning";
import { parseStudentLearningQuery, type StudentLearningSearchParams } from "@/lib/resources/student-learning-query";

export default async function StudentContinueLearningPage({
  searchParams,
}: {
  searchParams: Promise<StudentLearningSearchParams>;
}) {
  const user = await requireStudent();
  const query = parseStudentLearningQuery(await searchParams);
  const result = await getStudentContinueLearning(user.id, query);

  if (!result) {
    return <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-white px-6 py-12 text-center"><h1 className="text-2xl font-bold text-slate-900">Student profile required</h1><p className="mt-3 text-sm text-slate-600">Complete your student profile to track learning progress.</p></section>;
  }

  const { page, totalPages, total } = result.pagination;
  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Your learning history</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Continue Learning</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Resume accessible resources in order of your latest activity.</p>
      </header>
      <div className="flex items-center justify-between gap-3 text-sm"><p className="font-semibold text-slate-700">{total} {total === 1 ? "resource" : "resources"}</p><p className="text-slate-500">Page {page} of {totalPages}</p></div>
      {result.items.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{result.items.map((item) => <StudentResourceCard key={item.id} item={item} bookmarked={false} showBookmark={false} />)}</div>
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><h2 className="text-xl font-bold text-slate-900">No learning activity yet</h2><p className="mt-2 text-sm text-slate-600">Open a PDF and change pages to begin tracking progress.</p><Link href="/student/resources/search" className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white">Find a resource</Link></section>
      )}
      {totalPages > 1 ? <nav aria-label="Continue Learning pages" className="flex justify-center gap-3">{page > 1 ? <Link href={`/student/continue-learning?page=${page - 1}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Previous</Link> : null}{page < totalPages ? <Link href={`/student/continue-learning?page=${page + 1}`} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Next</Link> : null}</nav> : null}
    </div>
  );
}
