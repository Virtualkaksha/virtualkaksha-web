import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, UserRoundCheck, XCircle } from "lucide-react";

import {
  approveTeacherAccessAction,
  rejectTeacherAccessAction,
} from "@/app/teacher-access/actions";
import { requireCurrentRole } from "@/lib/auth/current-identity";
import {
  countTeacherAccessRequests,
  findTeacherAccessRequests,
} from "@/repositories/teacher-access.repository";

export const metadata: Metadata = {
  title: "Teacher access requests",
};

type Props = {
  searchParams: Promise<{
    status?: string;
    approved?: string;
    rejected?: string;
    error?: string;
    focus?: string;
  }>;
};

function nameOf(user: { displayName: string | null; firstName: string; lastName: string | null } | null) {
  if (!user) return null;
  return user.displayName ?? [user.firstName, user.lastName].filter(Boolean).join(" ");
}

export default async function AdminTeacherRequestsPage({ searchParams }: Props) {
  await requireCurrentRole("ADMIN");
  const params = await searchParams;
  const statusFilter =
    params.status === "APPROVED" || params.status === "REJECTED" || params.status === "PENDING"
      ? params.status
      : "PENDING";

  const [requests, pendingCount, approvedCount, rejectedCount] = await Promise.all([
    findTeacherAccessRequests(statusFilter),
    countTeacherAccessRequests("PENDING"),
    countTeacherAccessRequests("APPROVED"),
    countTeacherAccessRequests("REJECTED"),
  ]);

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-semibold text-blue-700">Teacher onboarding</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Teacher access requests</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Applications submitted from the public Teacher Access form appear here. Approve to create
          teacher login access with the password they chose.
        </p>
      </header>

      {params.approved === "1" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
          Request approved. The teacher can now sign in at Teacher login.
        </div>
      ) : null}
      {params.rejected === "1" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Request rejected.
        </div>
      ) : null}
      {params.error === "reason" ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
          Rejection reason must be at least 10 characters.
        </div>
      ) : null}
      {params.error === "unavailable" ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
          That request is no longer pending.
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Pending", pendingCount, "PENDING"],
          ["Approved", approvedCount, "APPROVED"],
          ["Rejected", rejectedCount, "REJECTED"],
        ].map(([label, count, status]) => (
          <Link
            key={status}
            href={`/admin/teacher-requests?status=${status}`}
            className={`rounded-2xl border p-5 shadow-sm transition ${
              statusFilter === status
                ? "border-blue-300 bg-blue-50"
                : "border-slate-200 bg-white hover:border-blue-200"
            }`}
          >
            <p className="text-3xl font-bold text-slate-950">{count}</p>
            <p className="mt-1 text-sm text-slate-600">{label}</p>
          </Link>
        ))}
      </section>

      <section className="space-y-4">
        {requests.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No {statusFilter.toLowerCase()} teacher access requests.
          </div>
        ) : (
          requests.map((item) => {
            const fullName = [item.firstName, item.lastName].filter(Boolean).join(" ");
            const focused = params.focus === item.id;
            return (
              <article
                key={item.id}
                id={item.id}
                className={`rounded-3xl border bg-white p-6 shadow-sm sm:p-8 ${
                  focused ? "border-rose-300 ring-4 ring-rose-100" : "border-slate-200"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold text-slate-950">{fullName}</h2>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {item.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.email}</p>
                    <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                      <div>
                        <dt className="text-slate-500">Subjects</dt>
                        <dd className="mt-1 font-medium">{item.subjects}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Experience</dt>
                        <dd className="mt-1 font-medium">
                          {item.experienceYears == null ? "Not provided" : `${item.experienceYears} years`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">City</dt>
                        <dd className="mt-1 font-medium">{item.city || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Phone</dt>
                        <dd className="mt-1 font-medium">{item.phone || "Not provided"}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-slate-500">Message</dt>
                        <dd className="mt-1 font-medium leading-6">{item.message || "No message"}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Submitted</dt>
                        <dd className="mt-1 font-medium">{item.createdAt.toLocaleString()}</dd>
                      </div>
                      {item.reviewedBy ? (
                        <div>
                          <dt className="text-slate-500">Reviewed by</dt>
                          <dd className="mt-1 font-medium">{nameOf(item.reviewedBy)}</dd>
                        </div>
                      ) : null}
                      {item.adminNote ? (
                        <div className="sm:col-span-2">
                          <dt className="text-slate-500">Admin note</dt>
                          <dd className="mt-1 font-medium leading-6">{item.adminNote}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>

                  {item.status === "PENDING" ? (
                    <div className="w-full max-w-sm space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <form action={approveTeacherAccessAction}>
                        <input type="hidden" name="requestId" value={item.id} />
                        <button
                          type="submit"
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800"
                        >
                          <UserRoundCheck size={17} />
                          Approve & create teacher access
                        </button>
                      </form>
                      <form action={rejectTeacherAccessAction} className="space-y-2">
                        <input type="hidden" name="requestId" value={item.id} />
                        <label htmlFor={`reason-${item.id}`} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Rejection reason
                        </label>
                        <textarea
                          id={`reason-${item.id}`}
                          name="reason"
                          required
                          minLength={10}
                          rows={3}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          placeholder="Explain why this request is rejected (min 10 characters)."
                        />
                        <button
                          type="submit"
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          <XCircle size={17} />
                          Reject request
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                      <CheckCircle2 size={17} className="text-blue-700" />
                      Review complete
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
