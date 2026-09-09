import Link from "next/link";

import { requireCurrentRole } from "@/lib/auth/current-identity";
import { findPracticeTestCatalogue, findStudentAttempts, findStudentOpenAttempt } from "@/repositories/practice-test.repository";
import prisma from "@/lib/prisma";
import TestSetupForm from "./TestSetupForm";

function kindLabel(kind: string) {
  if (kind === "CHAPTER") return "Chapter test";
  if (kind === "COMBINED_CHAPTER") return "Combined chapter test";
  if (kind === "SUBJECT") return "Subject test";
  return "Full class test";
}

export default async function StudentTestsPage() {
  const user = await requireCurrentRole("STUDENT");
  const [catalogue, open, history, profile] = await Promise.all([
    findPracticeTestCatalogue(),
    findStudentOpenAttempt(user.id),
    findStudentAttempts(user.id),
    prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { boardId: true, classLevelId: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Practice tests</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Attempt a test</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Choose your class and subject. The paper is generated automatically from published teacher questions.
        </p>
      </header>

      {open ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5">
          <p className="font-semibold text-amber-950">You have a test in progress.</p>
          <p className="mt-1 text-sm text-amber-900">Submit it before starting another paper.</p>
          <Link href={`/student/tests/${open.id}`} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-amber-700 px-5 text-sm font-semibold text-white">
            Continue test
          </Link>
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-950">Start a new test</h2>
          <p className="mt-2 text-sm text-slate-600">
            Sample questions are published for every CBSE Class 10, 11 and 12 chapter in Science/Physics, Chemistry and Mathematics.
          </p>
          <div className="mt-6">
            <TestSetupForm
              catalogue={catalogue}
              defaultBoardId={profile?.boardId ?? undefined}
              defaultClassLevelId={profile?.classLevelId ?? undefined}
            />
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold text-slate-950">Recent attempts</h2>
        <div className="mt-4 divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-white">
          {history.map((attempt) => (
            <div key={attempt.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-950">{kindLabel(attempt.kind)}</p>
                <p className="text-sm text-slate-500">
                  {attempt.classLevel.name}
                  {attempt.subject ? ` · ${attempt.subject.name}` : ""}
                  {attempt.status === "SUBMITTED" ? ` · ${attempt.scoreCorrect}/${attempt.scoreTotal}` : " · In progress"}
                </p>
              </div>
              <Link
                href={attempt.status === "SUBMITTED" ? `/student/tests/${attempt.id}/result` : `/student/tests/${attempt.id}`}
                className="text-sm font-semibold text-blue-700"
              >
                {attempt.status === "SUBMITTED" ? "View result" : "Continue"}
              </Link>
            </div>
          ))}
          {history.length === 0 ? <p className="px-5 py-8 text-sm text-slate-500">No attempts yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
