import SectionTitle from "./ui/SectionTitle";
import Link from "next/link";

import { CATALOGUE_TYPE_SLUGS, publicCatalogueTypeHref } from "@/lib/resources/catalogue-types";

const tests = [
  {
    title: "Chapter Tests",
    description: "Practice chapter-wise questions and strengthen every concept.",
    icon: "📝",
    href: "/student/tests",
  },
  {
    title: "Subject Tests",
    description: "Evaluate your preparation with complete subject tests.",
    icon: "📚",
    href: "/student/tests",
  },
  {
    title: "Full Syllabus Tests",
    description: "Simulate real exam conditions with full-length class tests.",
    icon: "🎯",
    href: "/student/tests",
  },
  {
    title: "Previous Year Papers",
    description: "Solve previous exam papers to understand question patterns.",
    icon: "📄",
    href: publicCatalogueTypeHref(CATALOGUE_TYPE_SLUGS.previousYearQuestions),
  },
];

export default function PracticeTests() {
  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          title="Practice Makes Perfect"
          subtitle="Build confidence with chapter tests, mock exams and previous year papers."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {tests.map((test) => (
            <Link
              key={test.title}
              href={test.href}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-6 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
            >
              <div className="text-4xl">{test.icon}</div>

              <h3 className="mt-5 text-xl font-bold text-slate-900">
                {test.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {test.description}
              </p>

              <span className="mt-4 inline-block text-sm font-semibold text-blue-700">
                Explore {test.title} →
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link href="/student/tests" className="rounded-2xl bg-blue-600 px-8 py-4 font-semibold text-white transition hover:bg-blue-700">
            Start Practising
          </Link>
        </div>
      </div>
    </section>
  );
}
