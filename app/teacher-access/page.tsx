import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import TeacherAccessRequestForm from "@/app/components/teacher/TeacherAccessRequestForm";

export const metadata: Metadata = {
  title: "Request teacher access",
  description: "Apply for VirtualKaksha teacher access. Requests are reviewed by admins before login is enabled.",
  alternates: { canonical: "/teacher-access" },
};

type Props = {
  searchParams: Promise<{ submitted?: string }>;
};

export default async function TeacherAccessRequestPage({ searchParams }: Props) {
  const params = await searchParams;
  const submitted = params.submitted === "1";

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          For teachers
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
          Request teacher access
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Submit one form. Your request appears directly on the admin review page. After approval,
          use the same email and password on Teacher login.
        </p>

        {submitted ? (
          <div className="mt-10 rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
            <h2 className="text-2xl font-bold text-emerald-950">Request received</h2>
            <p className="mt-3 leading-7 text-emerald-900">
              An admin will review your application. Once approved, sign in at Teacher login with
              the email and password you just set.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/teacher/login"
                className="inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-5 font-semibold text-white"
              >
                Go to Teacher login
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center rounded-xl border border-emerald-300 bg-white px-5 font-semibold text-emerald-900"
              >
                Back to home
              </Link>
            </div>
          </div>
        ) : (
          <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <TeacherAccessRequestForm />
            <p className="mt-6 text-center text-sm text-slate-600">
              Already approved?{" "}
              <Link href="/teacher/login" className="font-semibold text-blue-700">
                Teacher login
              </Link>
            </p>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
