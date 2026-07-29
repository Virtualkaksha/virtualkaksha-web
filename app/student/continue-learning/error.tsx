"use client";

export default function StudentContinueLearningError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white px-6 py-12 text-center"><h1 className="text-2xl font-bold text-slate-900">Learning history could not be loaded</h1><p className="mt-3 text-sm text-slate-600">Please try again.</p><button type="button" onClick={reset} className="mt-6 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white">Try again</button></section>;
}
