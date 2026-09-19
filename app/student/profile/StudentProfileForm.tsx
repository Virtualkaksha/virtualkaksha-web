"use client";

import { Camera, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { updateStudentProfileAction, type UpdateStudentProfileState } from "./actions";

const field =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function StudentProfileForm({
  firstName,
  lastName,
  initials,
  photoSrc,
}: {
  firstName: string;
  lastName: string;
  initials: string;
  photoSrc: string | null;
}) {
  const [state, action, pending] = useActionState(
    updateStudentProfileAction,
    { status: "idle" } satisfies UpdateStudentProfileState,
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const shownPhoto = useMemo(() => {
    if (removePhoto) return null;
    return preview ?? photoSrc;
  }, [photoSrc, preview, removePhoto]);

  return (
    <form action={action} className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`sm:col-span-2 rounded-xl px-4 py-3 text-sm ${
            state.status === "error"
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col items-center gap-3 sm:items-start">
        <label className="relative cursor-pointer">
          <span className="sr-only">Change profile photo</span>
          <span className="flex h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-slate-950 text-2xl font-bold text-white shadow-md ring-1 ring-slate-200">
            {shownPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shownPhoto} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center">{initials}</span>
            )}
          </span>
          <span className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-white shadow">
            <Camera className="h-4 w-4" aria-hidden="true" />
          </span>
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setRemovePhoto(false);
              setPreview((current) => {
                if (current) URL.revokeObjectURL(current);
                return file ? URL.createObjectURL(file) : null;
              });
            }}
          />
        </label>
        {shownPhoto ? (
          <button
            type="button"
            onClick={() => {
              setPreview((current) => {
                if (current) URL.revokeObjectURL(current);
                return null;
              });
              setRemovePhoto(true);
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-rose-700"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Remove photo
          </button>
        ) : (
          <p className="text-xs text-slate-500">JPG, PNG or WEBP · up to 1 MB</p>
        )}
        {removePhoto ? <input type="hidden" name="removePhoto" value="on" /> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="text-sm font-semibold text-slate-800">First name</span>
          <input id="firstName" name="firstName" required defaultValue={firstName} autoComplete="given-name" className={field} />
          {state.fieldErrors?.firstName?.map((message) => (
            <p key={message} className="mt-1.5 text-xs font-medium text-red-600">{message}</p>
          ))}
        </label>
        <label>
          <span className="text-sm font-semibold text-slate-800">Last name</span>
          <input id="lastName" name="lastName" defaultValue={lastName} autoComplete="family-name" className={field} />
          {state.fieldErrors?.lastName?.map((message) => (
            <p key={message} className="mt-1.5 text-xs font-medium text-red-600">{message}</p>
          ))}
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-12 items-center rounded-xl bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>
    </form>
  );
}
