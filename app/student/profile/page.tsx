import type { Metadata } from "next";

import { logoutAllSessionsAction } from "@/app/(auth)/actions";
import { requireCurrentRole } from "@/lib/auth/current-identity";
import { getStudentAccountSummary } from "@/lib/student/directory";
import { getStudentClassScope } from "@/lib/students/class-scope";
import { STUDENT_AVATAR_SRC } from "@/lib/students/profile-avatar";
import StudentClassForm from "./StudentClassForm";
import StudentPasswordForm from "./StudentPasswordForm";
import StudentProfileForm from "./StudentProfileForm";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Your VirtualKaksha student account details.",
};

export default async function StudentProfilePage() {
  const user = await requireCurrentRole("STUDENT");
  const [account, classScope] = await Promise.all([
    getStudentAccountSummary(user.id),
    getStudentClassScope(user.id),
  ]);

  if (!account) {
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-white px-6 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Profile is unavailable</h1>
        <p className="mt-3 text-sm text-slate-600">Please try again in a moment.</p>
      </section>
    );
  }

  const details = [
    { label: "Email address", value: account.email },
    { label: "Member since", value: account.memberSince },
    { label: "Last sign-in", value: account.lastSignIn ?? "This is your first session" },
    { label: "Access", value: account.roles.join(", ") },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Your account</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">My Profile</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Update your name and photo. Email stays the same so you can keep signing in.
        </p>
        <StudentProfileForm
          firstName={account.firstName}
          lastName={account.lastName}
          initials={account.initials}
          photoSrc={account.avatarUrl ? STUDENT_AVATAR_SRC : null}
        />
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-sm sm:px-10">
        <h2 className="text-lg font-bold text-slate-950">Account details</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label}>
              <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{detail.label}</dt>
              <dd className="mt-1.5 break-words text-sm font-semibold text-slate-900">{detail.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-sm sm:px-10">
        <h2 className="text-lg font-bold text-slate-950">Class and board</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Resources, chapters and tests stay limited to this class. Update it when you move to the next class.
        </p>
        <StudentClassForm boardSlug={classScope?.boardSlug ?? "cbse"} classSlug={classScope?.classSlug ?? ""} />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-sm sm:px-10">
        <h2 className="text-lg font-bold text-slate-950">Password</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Changing your password signs out other browsers and devices. You stay signed in here.
        </p>
        <StudentPasswordForm />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-sm sm:px-10">
        <h2 className="text-lg font-bold text-slate-950">Security</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Signing out everywhere ends every active session, including other browsers and devices.
          You will need to sign in again.
        </p>
        <form
          action={async () => {
            "use server";
            await logoutAllSessionsAction();
          }}
          className="mt-5"
        >
          <button
            type="submit"
            className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            Sign out on all devices
          </button>
        </form>
      </section>
    </div>
  );
}
