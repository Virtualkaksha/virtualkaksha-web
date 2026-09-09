import Link from "next/link";

import { requireAnyCurrentRole } from "@/lib/auth/current-identity";
import { findTeacherQuestionChapters } from "@/repositories/practice-test.repository";
import QuestionCreateForm from "../QuestionCreateForm";

export default async function NewTeacherQuestionPage() {
  await requireAnyCurrentRole(["TEACHER", "ADMIN"]);
  const chapters = await findTeacherQuestionChapters();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/teacher/questions" className="text-sm font-semibold text-blue-700">← Question bank</Link>
      <header className="mt-5">
        <h1 className="text-3xl font-bold text-slate-950">Add a question</h1>
        <p className="mt-2 text-sm text-slate-600">Students never see unpublished questions. Admin review is required unless you are an admin.</p>
      </header>
      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <QuestionCreateForm chapters={chapters} />
      </section>
    </main>
  );
}
