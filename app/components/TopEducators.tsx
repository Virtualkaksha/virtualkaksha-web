import Link from "next/link";

import SectionTitle from "./ui/SectionTitle";

const roles = [
  ["Students", "Browse published resources, bookmark useful material, and save PDF reading progress."],
  ["Teachers", "Create and submit educational resources through a moderated publishing workflow."],
  ["Coaching institutes", "Organise educators and learning material within supported platform workflows."],
] as const;

/** Kept for catalogue/marketing copy references; homepage uses TeacherSection. */
export default function TopEducators() {
  return (
    <section className="bg-slate-50 px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          title="Learning roles on VirtualKaksha"
          subtitle="Purpose-built workspaces support resource discovery, creation, and moderation."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {roles.map(([title, description]) => (
            <article key={title} className="rounded-3xl border border-slate-200 bg-white p-7">
              <h3 className="text-xl font-bold text-slate-900">{title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{description}</p>
              {title === "Teachers" ? (
                <Link href="/teacher/login" className="mt-5 inline-flex text-sm font-semibold text-blue-700">
                  Teacher login →
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
