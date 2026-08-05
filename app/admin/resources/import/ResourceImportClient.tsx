"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type Outcome = "VALID_CHANGE" | "NO_OP" | "INVALID" | "CONFLICT";
type Preview = { summary: { totalRows: number; validChanges: number; noOpRows: number; invalidRows: number; conflicts: number }; rows: Array<{
  rowNumber: number; resourceId: string; currentTitle: string | null; proposedTitle: string; currentVersion: number | null;
  expectedVersion: number | null; currentStatus: string | null; resultingStatus: string | null; changedFields: string[];
  validationErrors: string[]; referenceErrors: string[]; mappingChangeWarning: string | null; slugCollisionWarning: string | null;
  publicVisibilityRemoval: boolean; outcome: Outcome; safeToApply: boolean;
}> };

export default function ResourceImportClient() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [filter, setFilter] = useState<Outcome | "ALL">("ALL");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setPreview(null);
    const response = await fetch("/api/admin/resources/import/preview", { method: "POST", body: new FormData(event.currentTarget), credentials: "same-origin" }).catch(() => null);
    if (!response) setError("The CSV preview is temporarily unavailable.");
    else {
      const result = await response.json().catch(() => null);
      if (!response.ok) setError(typeof result?.error === "string" ? result.error : "The CSV preview could not be produced.");
      else setPreview(result as Preview);
    }
    setPending(false);
  }
  const rows = preview?.rows.filter((row) => filter === "ALL" || row.outcome === filter) ?? [];
  return <>
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
      <p className="font-bold text-amber-950">Preview only. No resource will be changed.</p>
      <p className="mt-2 text-sm text-amber-900">Direct status, asset, URL, slug, uploader, and file changes are forbidden. Read-only context columns do not control the preview.</p>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <Link href="/admin/resources/export?mode=import-template" className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Download latest template</Link>
      <form onSubmit={submit} className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-end">
        <label className="grid gap-1 text-sm font-semibold">CSV file<input name="file" type="file" accept=".csv,text/csv" required className="rounded-lg border p-2 font-normal" /></label>
        <button disabled={pending} className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Reading preview…" : preview ? "Choose another file" : "Preview CSV"}</button>
      </form>
      {error && <p role="alert" className="mt-4 text-sm font-semibold text-rose-700">{error}</p>}
    </section>
    {preview && <>
      <section className="grid gap-3 sm:grid-cols-5">{Object.entries({ Rows: preview.summary.totalRows, "Valid changes": preview.summary.validChanges, "No-op": preview.summary.noOpRows, Invalid: preview.summary.invalidRows, Conflicts: preview.summary.conflicts }).map(([label, value]) => <div key={label} className="rounded-xl border bg-white p-4"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</section>
      <section className="rounded-2xl border bg-white p-4"><label className="text-sm font-semibold">Outcome filter <select value={filter} onChange={(event) => setFilter(event.target.value as Outcome | "ALL")} className="ml-2 rounded-lg border p-2">{["ALL","VALID_CHANGE","NO_OP","INVALID","CONFLICT"].map((value) => <option key={value}>{value}</option>)}</select></label></section>
      <section className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-[1300px] text-left text-xs"><thead className="bg-slate-50"><tr>{["Row / resource","Titles","Versions","Status","Outcome","Changed fields","Warnings and errors"].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={`${row.rowNumber}:${row.resourceId}`} className="align-top"><td className="px-4 py-3">Row {row.rowNumber}<br/><code>{row.resourceId}</code></td><td className="px-4 py-3">Current: {row.currentTitle ?? "Unavailable"}<br/>Proposed: {row.proposedTitle}</td><td className="px-4 py-3">Current {row.currentVersion ?? "—"}<br/>Expected {row.expectedVersion ?? "—"}</td><td className="px-4 py-3">{row.currentStatus ?? "—"} → {row.resultingStatus ?? "—"}</td><td className="px-4 py-3 font-semibold">{row.outcome}</td><td className="px-4 py-3">{row.changedFields.join(", ") || "None"}</td><td className="px-4 py-3"><ul className="space-y-1">{row.publicVisibilityRemoval && <li className="font-semibold text-amber-800">Public visibility would be removed.</li>}{[...row.validationErrors, ...row.referenceErrors, row.mappingChangeWarning, row.slugCollisionWarning].filter(Boolean).map((message, index) => <li key={index}>{message}</li>)}</ul></td></tr>)}</tbody></table></section>
    </>}
  </>;
}
