import Link from "next/link";

import { requireAnyCurrentRole } from "@/lib/auth/current-identity";
import { findTeacherQuestions } from "@/repositories/practice-test.repository";

export default async function TeacherQuestionsPage() {
  const user = await requireAnyCurrentRole(["TEACHER", "ADMIN"]);
  const questions = await findTeacherQuestions(user.id);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">Question bank</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Practice questions</h1>
          <p className="mt-2 text-sm text-slate-600">Add MCQs. After admin approval they can appear in auto-generated student tests.</p>
        </div>
        <Link href="/teacher/questions/new" className="inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white">
          Add question
        </Link>
      </header>
      <section className="mt-8 divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {questions.map((question) => (
          <article key={question.id} className="px-5 py-4">
            <p className="font-semibold text-slate-950">{question.prompt}</p>
            <p className="mt-1 text-xs text-slate-500">
              {question.chapter.boardClassSubject.classLevel.name} · {question.chapter.boardClassSubject.subject.name} · {question.chapter.name} · {question.status.replaceAll("_", " ")}
            </p>
            {question.moderationNote && question.status === "REJECTED" ? (
              <p className="mt-2 text-xs text-rose-700">{question.moderationNote}</p>
            ) : null}
          </article>
        ))}
        {questions.length === 0 ? <p className="px-5 py-10 text-sm text-slate-500">No questions yet.</p> : null}
      </section>
    </main>
  );
}
