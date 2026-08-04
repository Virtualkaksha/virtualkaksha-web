import Link from "next/link";
import SectionTitle from "./ui/SectionTitle";
const capabilities = [
  ["Board and class filters", "Narrow published resources by board, class, subject, and chapter."],
  ["Exam discovery", "Browse JEE, NEET, and CUET material where matching content is available."],
  ["Reading continuity", "Signed-in students can bookmark resources and continue PDF reading progress."],
];
export default function Courses() { return <section className="bg-slate-50 py-20"><div className="mx-auto max-w-7xl px-6"><SectionTitle title="Built for focused learning" subtitle="Use factual filters and learning tools without invented course counts or durations." /><div className="grid gap-6 md:grid-cols-3">{capabilities.map(([title, description]) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-7"><h3 className="text-xl font-bold text-slate-900">{title}</h3><p className="mt-3 leading-7 text-slate-600">{description}</p></article>)}</div><div className="mt-10 text-center"><Link href="/search" className="inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">Browse resources</Link></div></div></section>; }
