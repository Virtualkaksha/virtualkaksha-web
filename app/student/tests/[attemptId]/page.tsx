import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireCurrentRole } from "@/lib/auth/current-identity";
import { findOwnedAttempt } from "@/repositories/practice-test.repository";
import AttemptForm from "./AttemptForm";

export default async function StudentTestAttemptPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireCurrentRole("STUDENT");
  const { attemptId } = await params;
  const { error } = await searchParams;
  const attempt = await findOwnedAttempt(attemptId, user.id);
  if (!attempt) notFound();
  if (attempt.status === "SUBMITTED") redirect(`/student/tests/${attempt.id}/result`);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/student/tests" className="text-sm font-semibold text-blue-700">← Tests</Link>
      <header>
        <p className="text-sm font-semibold text-blue-700">
          {attempt.classLevel.name}
          {attempt.subject ? ` · ${attempt.subject.name}` : ""}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Attempt in progress</h1>
        <p className="mt-2 text-sm text-slate-600">{attempt.items.length} questions. Submit when you are done.</p>
      </header>
      {error === "limited" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Too many submissions just now. Wait a moment and try again.
        </p>
      ) : null}
      <AttemptForm
        attemptId={attempt.id}
        items={attempt.items.map(({ correctOption: _correct, selectedOption: _selected, ...item }) => item)}
      />
    </div>
  );
}
