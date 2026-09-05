"use client";

import Link from "next/link";
import { useActionState } from "react";

import { adminLoginAction, studentLoginAction, teacherLoginAction, type AuthActionState } from "@/app/(auth)/actions";
import AuthSubmitButton from "@/app/components/auth/AuthSubmitButton";
import type { LoginRole } from "@/lib/auth/role-routing";

const initialState: AuthActionState = {
  status: "idle",
};

const actions = { STUDENT: studentLoginAction, TEACHER: teacherLoginAction, ADMIN: adminLoginAction } as const;

const roleTabs = [
  { role: "STUDENT", href: "/login", label: "Student" },
  { role: "TEACHER", href: "/teacher/login", label: "Teacher" },
  { role: "ADMIN", href: "/admin/login", label: "Admin" },
] as const;

export default function LoginForm({ expectedRole }: { expectedRole: LoginRole }) {
  const [state, action] = useActionState(actions[expectedRole], initialState);

  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1" role="tablist" aria-label="Choose login workspace">
        {roleTabs.map((tab) => {
          const active = tab.role === expectedRole;
          return active ? (
            <span
              key={tab.role}
              role="tab"
              aria-selected="true"
              className="rounded-xl bg-white px-3 py-2.5 text-center text-sm font-semibold text-slate-950 shadow-sm"
            >
              {tab.label}
            </span>
          ) : (
            <Link
              key={tab.role}
              href={tab.href}
              role="tab"
              aria-selected="false"
              className="rounded-xl px-3 py-2.5 text-center text-sm font-semibold text-slate-600 transition hover:bg-white/70 hover:text-blue-700"
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

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
          placeholder="you@example.com"
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

      {expectedRole === "STUDENT" ? (
        <p className="text-center text-sm text-slate-600">
          New to VirtualKaksha?{" "}
          <Link href="/signup" className="font-semibold text-blue-700 hover:text-blue-800">
            Create a student account
          </Link>
        </p>
      ) : expectedRole === "TEACHER" ? (
        <p className="text-center text-sm text-slate-600">
          First time here?{" "}
          <Link href="/teacher-access" className="font-semibold text-blue-700 hover:text-blue-800">
            Request teacher access
          </Link>
        </p>
      ) : (
        <p className="text-center text-sm text-slate-600">
          Admin accounts are assigned by VirtualKaksha. Need help?{" "}
          <Link href="/contact" className="font-semibold text-blue-700 hover:text-blue-800">
            Contact us
          </Link>
          .
        </p>
      )}
    </form>
  );
}
