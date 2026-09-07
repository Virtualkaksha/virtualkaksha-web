import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";

import { requireCurrentRole } from "@/lib/auth/current-identity";
import { getPublishedInstituteDirectory } from "@/lib/student/directory";

export const metadata: Metadata = {
  title: "Coaching Institutes",
  description: "Coaching institutes with a published profile on VirtualKaksha.",
};

export default async function StudentCoachingInstitutesPage() {
  await requireCurrentRole("STUDENT");
  const institutes = await getPublishedInstituteDirectory();

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Institutes</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Coaching institutes</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Institutes with a published profile. VirtualKaksha does not handle admissions or payments
          on their behalf.
        </p>
      </header>

      {!institutes ? (
        <section className="rounded-3xl border border-amber-200 bg-white px-6 py-12 text-center">
          <h2 className="text-xl font-bold text-slate-900">Institute profiles are unavailable</h2>
          <p className="mt-2 text-sm text-slate-600">Please try again in a moment.</p>
        </section>
      ) : institutes.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {institutes.map((institute) => (
            <article key={institute.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-sm font-bold text-white">
                  {institute.initials}
                </span>
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-950">
                  <span className="truncate">{institute.name}</span>
                  {institute.isVerified ? (
                    <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Verified institute" />
                  ) : null}
                </h2>
              </div>

              {institute.summary ? (
                <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-600">{institute.summary}</p>
              ) : null}

              <dl className="mt-4 space-y-1.5 text-sm text-slate-600">
                {institute.teachingModeLabel ? <div>{institute.teachingModeLabel}</div> : null}
                {institute.city ? (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    {institute.city}
                  </div>
                ) : null}
              </dl>

              {institute.website ? (
                <a
                  href={institute.website}
                  rel="nofollow noopener noreferrer"
                  target="_blank"
                  className="mt-auto pt-4 text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  Visit website
                </a>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-xl font-bold text-slate-900">No published institutes yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Institute profiles appear here once they are published.
          </p>
          <Link href="/student/resources" className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white">
            Browse study resources
          </Link>
        </section>
      )}
    </div>
  );
}
