"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signupAction, type AuthActionState } from "@/app/(auth)/actions";
import AuthSubmitButton from "@/app/components/auth/AuthSubmitButton";

const initialState: AuthActionState = {
  status: "idle",
};

function FieldError({ messages }: { messages?: string[] }) {
  return messages?.map((message) => (
    <p key={message} className="mt-1.5 text-xs font-medium text-red-600">
      {message}
    </p>
  ));
}

export default function SignupForm() {
  const [state, action] = useActionState(signupAction, initialState);

  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      {state.message ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="text-sm font-semibold text-slate-800">
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            required
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <FieldError messages={state.fieldErrors?.firstName} />
        </div>

        <div>
          <label htmlFor="lastName" className="text-sm font-semibold text-slate-800">
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <FieldError messages={state.fieldErrors?.lastName} />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-semibold text-slate-800">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
        <FieldError messages={state.fieldErrors?.email} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm leading-6 text-slate-700">
          Students under 18 should create an account only with permission from a parent or guardian. This beta acknowledgement is not verified parental consent. Read our <Link href="/terms" className="font-semibold text-blue-700">Terms</Link> and <Link href="/privacy" className="font-semibold text-blue-700">Privacy Policy</Link>.
        </p>
        <label className="mt-3 flex items-start gap-3 text-sm font-medium text-slate-800">
          <input type="checkbox" name="guardianAcknowledgement" required className="mt-1 h-4 w-4" />
          <span>I confirm that I am 18 or older, or I have permission from my parent or guardian.</span>
        </label>
        <FieldError messages={state.fieldErrors?.guardianAcknowledgement} />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-semibold text-slate-800">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
        <p className="mt-1.5 text-xs leading-5 text-slate-500">
          Use 8–72 characters with uppercase, lowercase and a number.
        </p>
        <FieldError messages={state.fieldErrors?.password} />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-800">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
        <FieldError messages={state.fieldErrors?.confirmPassword} />
      </div>

      <AuthSubmitButton label="Create student account" />

      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-blue-700 hover:text-blue-800">
          Sign in
        </Link>
      </p>
    </form>
  );
}
