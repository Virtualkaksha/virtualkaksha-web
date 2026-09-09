"use client";

import { useState } from "react";

import { submitStudentPracticeTest } from "../actions";

type Item = {
  id: string;
  sortOrder: number;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

const options = ["optionA", "optionB", "optionC", "optionD"] as const;

export default function AttemptForm({ attemptId, items }: { attemptId: string; items: Item[] }) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action={submitStudentPracticeTest}
      onSubmit={() => setPending(true)}
      className="space-y-6"
    >
      <input type="hidden" name="attemptId" value={attemptId} />
      {items.map((item, index) => (
        <section key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <input type="hidden" name="itemId" value={item.id} />
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Question {index + 1}</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">{item.prompt}</h2>
          <div className="mt-4 space-y-2">
            {options.map((key, optionIndex) => (
              <label key={key} className="flex min-h-11 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                <input type="radio" name={`answer-${item.id}`} value={optionIndex} required className="mt-1" />
                <span>{item[key]}</span>
              </label>
            ))}
          </div>
        </section>
      ))}
      <button type="submit" disabled={pending} className="min-h-12 rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
        {pending ? "Submitting..." : "Submit test"}
      </button>
    </form>
  );
}
