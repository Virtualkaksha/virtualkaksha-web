import Link from "next/link";
import { ArrowRight, CheckCircle2, FileUp, ListChecks, ShieldCheck } from "lucide-react";

import SectionTitle from "./ui/SectionTitle";

const workflow = [
  {
    step: "01",
    icon: FileUp,
    title: "Create & upload",
    description: "Add chapter-mapped resources and upload PDFs from one teacher workspace.",
  },
  {
    step: "02",
    icon: ListChecks,
    title: "Submit for review",
    description: "Send drafts into moderation so only verified material reaches students.",
  },
  {
    step: "03",
    icon: ShieldCheck,
    title: "Reach learners",
    description: "Once approved, your content appears in the correct board, class, and chapter.",
  },
] as const;

const highlights = [
  "Chapter-wise academic mapping",
  "Native PDF upload with validation",
  "Draft → review → publish workflow",
  "Clear rejection feedback and resubmit",
] as const;

export default function TeacherSection() {
  return (
    <section id="teachers" className="scroll-mt-24 bg-white px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          title="Built for teachers"
          subtitle="Publish trusted learning resources through a simple, moderated workflow—designed to fit the same VirtualKaksha experience students already use."
        />

        <div className="overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 shadow-sm">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-8 sm:p-10 lg:p-12">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                Teacher workspace
              </p>
              <h3 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Upload once. Reach the right classroom.
              </h3>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                Teachers create and submit content. Admins review it. Students discover only
                approved resources—so quality and trust stay intact.
              </p>

              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/teacher/login"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  Teacher login
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/teacher-access"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-7 py-3.5 font-semibold text-slate-800 transition duration-300 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  Request teacher access
                </Link>
              </div>
            </div>

            <div className="border-t border-blue-100 bg-white/70 p-8 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
              <p className="text-sm font-semibold text-blue-700">How it works</p>
              <ol className="mt-6 space-y-5">
                {workflow.map(({ step, icon: Icon, title, description }) => (
                  <li key={step} className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-blue-600 text-white">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Step {step}
                      </p>
                      <h4 className="mt-1 text-lg font-bold text-slate-950">{title}</h4>
                      <p className="mt-1.5 text-sm leading-6 text-slate-600">{description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Link
            href="/login"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 transition hover:border-blue-200 hover:bg-white hover:shadow-md"
          >
            <p className="text-sm font-semibold text-blue-700">Students</p>
            <p className="mt-1 font-bold text-slate-950">Continue learning →</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Browse published resources, bookmarks, and reading progress.
            </p>
          </Link>
          <Link
            href="/teacher/login"
            className="rounded-2xl border border-blue-200 bg-blue-50/80 px-6 py-5 transition hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
          >
            <p className="text-sm font-semibold text-blue-700">Teachers</p>
            <p className="mt-1 font-bold text-slate-950">Open teacher login →</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Create, upload, and manage your moderated submissions.
            </p>
          </Link>
          <Link
            href="/contact"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 transition hover:border-blue-200 hover:bg-white hover:shadow-md"
          >
            <p className="text-sm font-semibold text-blue-700">Institutes</p>
            <p className="mt-1 font-bold text-slate-950">Talk to us →</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Institute workflows are planned; reach out for early access.
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
}
