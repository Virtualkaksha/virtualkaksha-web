import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";

import { requireCurrentRole } from "@/lib/auth/current-identity";
import { getPublishedTeacherDirectory } from "@/lib/student/directory";

export const metadata: Metadata = {
  title: "Teachers",
  description: "Educators publishing learning resources on VirtualKaksha.",
};

export default async function StudentTeachersPage() {
  await requireCurrentRole("STUDENT");
  const teachers = await getPublishedTeacherDirectory();

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Educators</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Teachers on VirtualKaksha</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Educators with a published profile. Contact details are not shared here; open their
          resources from the study catalogue.
        </p>
      </header>

      {!teachers ? (
        <section className="rounded-3xl border border-amber-200 bg-white px-6 py-12 text-center">
          <h2 className="text-xl font-bold text-slate-900">Teacher profiles are unavailable</h2>
          <p className="mt-2 text-sm text-slate-600">Please try again in a moment.</p>
        </section>
      ) : teachers.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {teachers.map((teacher) => (
            <article key={teacher.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                  {teacher.initials}
                </span>
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-950">
                    <span className="truncate">{teacher.name}</span>
                    {teacher.isVerified ? (
                      <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Verified educator" />
                    ) : null}
                  </h2>
                  {teacher.headline ? (
                    <p className="mt-1 text-sm text-slate-600">{teacher.headline}</p>
                  ) : null}
                </div>
              </div>

              {teacher.summary ? (
                <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-600">{teacher.summary}</p>
              ) : null}

              <dl className="mt-4 space-y-1.5 text-sm text-slate-600">
                {teacher.experienceLabel ? <div>{teacher.experienceLabel}</div> : null}
                {teacher.qualification ? <div>{teacher.qualification}</div> : null}
                {teacher.teachingModeLabel ? <div>{teacher.teachingModeLabel}</div> : null}
                {teacher.city ? (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    {teacher.city}
                  </div>
                ) : null}
              </dl>

              <p className="mt-auto pt-4 text-sm font-semibold text-slate-700">
                {teacher.resourceCount} {teacher.resourceCount === 1 ? "published resource" : "published resources"}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-xl font-bold text-slate-900">No published teacher profiles yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Educator profiles appear here once they are published. Resources are already available in
            the study catalogue.
          </p>
          <Link href="/student/resources" className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white">
            Browse study resources
          </Link>
        </section>
      )}
    </div>
  );
}
