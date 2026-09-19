"use client";

import { useActionState, useState } from "react";

import { STUDENT_BOARD_OPTIONS, STUDENT_CLASS_OPTIONS, studentBoardName, studentClassName } from "@/lib/students/class-options";
import { updateStudentClassAction, type UpdateStudentClassState } from "./actions";

const field = "mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function StudentClassForm({
  boardSlug,
  classSlug,
}: {
  boardSlug: string;
  classSlug: string;
}) {
  const [state, action, pending] = useActionState(updateStudentClassAction, { status: "idle" } satisfies UpdateStudentClassState);
  const [pendingChange, setPendingChange] = useState<{ board: string; classLevel: string } | null>(null);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (pendingChange) return;
        const data = new FormData(event.currentTarget);
        const nextBoard = String(data.get("board") ?? "");
        const nextClass = String(data.get("classLevel") ?? "");
        if (nextBoard === boardSlug && nextClass === classSlug) return;
        event.preventDefault();
        setPendingChange({ board: nextBoard, classLevel: nextClass });
      }}
      className="mt-5 grid gap-4 sm:grid-cols-2"
    >
      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`sm:col-span-2 rounded-xl px-4 py-3 text-sm ${
            state.status === "error" ? "border border-red-200 bg-red-50 text-red-700" : "border border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {state.message}
        </p>
      ) : null}
      {pendingChange ? (
        <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p>
            You will now see <span className="font-semibold">{studentClassName(pendingChange.classLevel)} · {studentBoardName(pendingChange.board)}</span>{" "}
            resources. Your current class material will be hidden until you switch back.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPendingChange(null)}
              className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-10 items-center rounded-xl bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Yes, change class"}
            </button>
          </div>
          <input type="hidden" name="confirmClassChange" value="on" />
        </div>
      ) : null}
      <label>
        <span className="text-sm font-semibold text-slate-800">Board</span>
        <select
          name="board"
          required
          defaultValue={boardSlug || "cbse"}
          className={field}
          onChange={() => setPendingChange(null)}
        >
          {STUDENT_BOARD_OPTIONS.map((item) => (
            <option key={item.slug} value={item.slug}>{item.name}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="text-sm font-semibold text-slate-800">Class</span>
        <select
          name="classLevel"
          required
          defaultValue={classSlug}
          className={field}
          onChange={() => setPendingChange(null)}
        >
          <option value="" disabled>Select your class</option>
          {STUDENT_CLASS_OPTIONS.map((item) => (
            <option key={item.slug} value={item.slug}>{item.name}</option>
          ))}
        </select>
      </label>
      {pendingChange ? null : (
        <div className="sm:col-span-2">
          <button type="submit" disabled={pending} className="inline-flex min-h-12 items-center rounded-xl bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60">
            {pending ? "Saving…" : "Save class"}
          </button>
        </div>
      )}
    </form>
  );
}
