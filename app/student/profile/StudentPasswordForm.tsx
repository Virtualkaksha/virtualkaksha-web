"use client";

import { useActionState } from "react";

import { changeStudentPasswordAction, type ChangeStudentPasswordState } from "./actions";

const field =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function StudentPasswordForm() {
  const [state, action, pending] = useActionState(
    changeStudentPasswordAction,
    { status: "idle" } satisfies ChangeStudentPasswordState,
  );

  return (
    <form action={action} className="mt-5 grid gap-4 sm:max-w-md">
      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`rounded-xl px-4 py-3 text-sm ${
            state.status === "error"
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {state.message}
        </p>
      ) : null}
      <label>
        <span className="text-sm font-semibold text-slate-800">Current password</span>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={field}
        />
        {state.fieldErrors?.currentPassword?.map((message) => (
          <p key={message} className="mt-1.5 text-xs font-medium text-red-600">{message}</p>
        ))}
      </label>
      <label>
        <span className="text-sm font-semibold text-slate-800">New password</span>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          className={field}
        />
        {state.fieldErrors?.newPassword?.map((message) => (
          <p key={message} className="mt-1.5 text-xs font-medium text-red-600">{message}</p>
        ))}
      </label>
      <label>
        <span className="text-sm font-semibold text-slate-800">Confirm new password</span>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className={field}
        />
        {state.fieldErrors?.confirmPassword?.map((message) => (
          <p key={message} className="mt-1.5 text-xs font-medium text-red-600">{message}</p>
        ))}
      </label>
      <p className="text-xs leading-5 text-slate-500">Use at least 8 characters with a mix of upper, lower and a number.</p>
      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 items-center rounded-xl bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {pending ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  );
}
