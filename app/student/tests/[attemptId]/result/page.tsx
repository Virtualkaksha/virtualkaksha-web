import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireCurrentRole } from "@/lib/auth/current-identity";
import { findOwnedAttempt } from "@/repositories/practice-test.repository";

const optionKeys = ["optionA", "optionB", "optionC", "optionD"] as const;

export default async function StudentTestResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const user = await requireCurrentRole("STUDENT");
  const { attemptId } = await params;
  const attempt = await findOwnedAttempt(attemptId, user.id);
  if (!attempt) notFound();
  if (attempt.status !== "SUBMITTED") redirect(`/student/tests/${attempt.id}`);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/student/tests" className="text-sm font-semibold text-blue-700">← Tests</Link>
      <section className="rounded-3xl bg-slate-950 px-6 py-8 text-white">
        <p className="text-sm font-semibold text-blue-300">Result</p>
        <h1 className="mt-2 text-3xl font-bold">{attempt.scoreCorrect} / {attempt.scoreTotal}</h1>
        <p className="mt-2 text-sm text-slate-300">
          {attempt.classLevel.name}
          {attempt.subject ? ` · ${attempt.subject.name}` : ""}
        </p>
      </section>
      {attempt.items.map((item) => {
        const selected = item.selectedOption;
        return (
          <section key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Question {item.sortOrder}</p>
            <h2 className="mt-2 font-semibold text-slate-950">{item.prompt}</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {optionKeys.map((key, index) => {
                const isCorrect = index === item.correctOption;
                const isSelected = selected === index;
                return (
                  <li
                    key={key}
                    className={`rounded-xl px-3 py-2 ${isCorrect ? "bg-emerald-50 text-emerald-950" : isSelected ? "bg-rose-50 text-rose-950" : "bg-slate-50 text-slate-700"}`}
                  >
                    {item[key]}
                    {isCorrect ? " · Correct" : isSelected ? " · Your answer" : ""}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
