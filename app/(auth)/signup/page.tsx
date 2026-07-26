import type { Metadata } from "next";

import SignupForm from "@/app/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create account | VirtualKaksha",
  description: "Create your VirtualKaksha student account.",
};

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
        Join VirtualKaksha
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
        Create your student account
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Set up a secure account to save resources and track learning progress.
      </p>
      <SignupForm />
    </div>
  );
}
