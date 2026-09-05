"use client";

import Link from "next/link";
import { useActionState } from "react";

import AuthSubmitButton from "@/app/components/auth/AuthSubmitButton";
import {
  requestTeacherAccessAction,
  type TeacherAccessActionState,
} from "@/app/teacher-access/actions";

const initialState: TeacherAccessActionState = { status: "idle" };

const fieldClass =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <div className="mt-1.5 space-y-1">
      {messages.map((message) => (
        <p key={message} className="text-xs font-medium text-red-600">
          {message}
        </p>
      ))}
    </div>
  );
}

export default function TeacherAccessRequestForm() {
  const [state, action] = useActionState(requestTeacherAccessAction, initialState);

  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      {state.message ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="text-sm font-semibold text-slate-800">
            First name
          </label>
          <input id="firstName" name="firstName" required className={fieldClass} placeholder="Ajeet" />
          <FieldError messages={state.fieldErrors?.firstName} />
        </div>
        <div>
          <label htmlFor="lastName" className="text-sm font-semibold text-slate-800">
            Last name
          </label>
          <input id="lastName" name="lastName" className={fieldClass} placeholder="Yadav" />
          <FieldError messages={state.fieldErrors?.lastName} />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-semibold text-slate-800">
          Email address
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={fieldClass} placeholder="teacher@example.com" />
        <FieldError messages={state.fieldErrors?.email} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="text-sm font-semibold text-slate-800">
            Phone (optional)
          </label>
          <input id="phone" name="phone" className={fieldClass} placeholder="+91 ..." />
          <FieldError messages={state.fieldErrors?.phone} />
        </div>
        <div>
          <label htmlFor="city" className="text-sm font-semibold text-slate-800">
            City (optional)
          </label>
          <input id="city" name="city" className={fieldClass} placeholder="Noida" />
          <FieldError messages={state.fieldErrors?.city} />
        </div>
      </div>

      <div>
        <label htmlFor="subjects" className="text-sm font-semibold text-slate-800">
          Subjects / classes you teach
        </label>
        <input
          id="subjects"
          name="subjects"
          required
          className={fieldClass}
          placeholder="Class 10 Maths, Class 12 Physics"
        />
        <FieldError messages={state.fieldErrors?.subjects} />
      </div>

      <div>
        <label htmlFor="experienceYears" className="text-sm font-semibold text-slate-800">
          Years of experience (optional)
        </label>
        <input id="experienceYears" name="experienceYears" inputMode="numeric" className={fieldClass} placeholder="5" />
        <FieldError messages={state.fieldErrors?.experienceYears} />
      </div>

      <div>
        <label htmlFor="message" className="text-sm font-semibold text-slate-800">
          Why do you want to teach on VirtualKaksha? (optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          placeholder="Share a short note for the admin review team."
        />
        <FieldError messages={state.fieldErrors?.message} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="password" className="text-sm font-semibold text-slate-800">
            Choose a password
          </label>
          <input id="password" name="password" type="password" required autoComplete="new-password" className={fieldClass} />
          <FieldError messages={state.fieldErrors?.password} />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-800">
            Confirm password
          </label>
          <input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" className={fieldClass} />
          <FieldError messages={state.fieldErrors?.confirmPassword} />
        </div>
      </div>

      <p className="text-sm leading-6 text-slate-600">
        After an admin approves your request, sign in at{" "}
        <Link href="/teacher/login" className="font-semibold text-blue-700">
          Teacher login
        </Link>{" "}
        with this email and password.
      </p>

      <AuthSubmitButton label="Submit teacher access request" />
    </form>
  );
}
