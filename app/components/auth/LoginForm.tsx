"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction, type AuthActionState } from "@/app/(auth)/actions";
import AuthSubmitButton from "@/app/components/auth/AuthSubmitButton";

const initialState: AuthActionState = {
  status: "idle",
};

export default function LoginForm() {
  const [state, action] = useActionState(loginAction, initialState);

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
          className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          placeholder="student@example.com"
        />
        {state.fieldErrors?.email?.map((message) => (
          <p key={message} className="mt-1.5 text-xs font-medium text-red-600">
            {message}
          </p>
        ))}
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-semibold text-slate-800">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          placeholder="Enter your password"
        />
        {state.fieldErrors?.password?.map((message) => (
          <p key={message} className="mt-1.5 text-xs font-medium text-red-600">
            {message}
          </p>
        ))}
      </div>

      <AuthSubmitButton label="Sign in" />

      <p className="text-center text-sm text-slate-600">
        New to VirtualKaksha?{" "}
        <Link href="/signup" className="font-semibold text-blue-700 hover:text-blue-800">
          Create a student account
        </Link>
      </p>
    </form>
  );
}
