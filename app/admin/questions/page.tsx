import Link from "next/link";

import { requireCurrentRole } from "@/lib/auth/current-identity";
import { findAdminPracticeQuestions } from "@/repositories/practice-test.repository";
import { approvePracticeQuestion, rejectPracticeQuestion } from "./actions";
import MutationSubmitButton from "@/components/MutationSubmitButton";

const optionKeys = ["optionA", "optionB", "optionC", "optionD"] as const;

export default async function AdminQuestionsPage({ searchParams }: { searchParams: Promise<{ status?: string; approved?: string; rejected?: string; rateLimited?: string; error?: string }> }) {
  await requireCurrentRole("ADMIN");
  const params = await searchParams;
  const status = params.status ?? "PENDING_REVIEW";
  const questions = await findAdminPracticeQuestions(status);
  const statuses = ["PENDING_REVIEW", "PUBLISHED", "REJECTED", "ALL"];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-semibold text-blue-700">Question moderation</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Practice questions</h1>
        <p className="mt-2 text-sm text-slate-600">Publish teacher MCQs into the student test bank.</p>
      </header>
      {params.approved === "1" ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Question published.</p> : null}
      {params.rejected === "1" ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Question rejected.</p> : null}
      {params.rateLimited === "1" ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Too many requests. Try again shortly.</p> : null}
      {params.error === "reason" ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Enter a rejection reason of at least 10 characters.</p> : null}
      <div className="flex flex-wrap gap-2">
        {statuses.map((item) => (
          <Link key={item} href={`/admin/questions?status=${item}`} className={`rounded-full px-4 py-2 text-xs font-semibold ${status === item ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600"}`}>
            {item.replaceAll("_", " ")}
          </Link>
        ))}
      </div>
      <div className="space-y-4">
        {questions.map((question) => (
          <article key={question.id} className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase text-slate-500">
              {question.chapter.boardClassSubject.classLevel.name} · {question.chapter.boardClassSubject.subject.name} · {question.chapter.name}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">{question.prompt}</h2>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {optionKeys.map((key, index) => (
                <li key={key}>{String.fromCharCode(65 + index)}. {question[key]}{index === question.correctOption ? " ✓" : ""}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">{question.createdBy?.email ?? "Unknown teacher"} · {question.status.replaceAll("_", " ")}</p>
            {question.status === "PENDING_REVIEW" ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <form action={approvePracticeQuestion}>
                  <input type="hidden" name="questionId" value={question.id} />
                  <MutationSubmitButton className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white">Publish</MutationSubmitButton>
                </form>
                <form action={rejectPracticeQuestion} className="space-y-2">
                  <input type="hidden" name="questionId" value={question.id} />
                  <textarea name="reason" required minLength={10} placeholder="Why is this question rejected?" className="min-h-20 w-full rounded-xl border border-slate-300 p-3 text-sm" />
                  <MutationSubmitButton className="min-h-11 w-full rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white">Reject</MutationSubmitButton>
                </form>
              </div>
            ) : null}
          </article>
        ))}
        {questions.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">No questions in this queue.</p> : null}
      </div>
    </main>
  );
}
