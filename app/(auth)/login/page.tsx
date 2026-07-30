import type { Metadata } from "next";

import LoginForm from "@/app/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in | VirtualKaksha",
  description: "Sign in to your VirtualKaksha account.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ signup?: string }> }) {
  const notice = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
        VirtualKaksha account
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
        Welcome back
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Sign in to continue to your secure workspace.
      </p>
      {notice.signup === "received" ? (
        <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          If registration could be completed, you can now sign in.
        </p>
      ) : null}
      <LoginForm />
    </div>
  );
}
