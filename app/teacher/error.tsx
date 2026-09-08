"use client";

import Link from "next/link";

type TeacherErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function TeacherError({ reset }: TeacherErrorProps) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <section className="rounded-3xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
          The teacher page could not be loaded. Try again, or return to your resources.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Try again
          </button>
          <Link
            href="/teacher/resources"
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-6 text-sm font-semibold text-slate-700"
          >
            My resources
          </Link>
        </div>
      </section>
    </main>
  );
}
