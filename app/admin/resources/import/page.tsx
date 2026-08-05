import { requireCurrentRole } from "@/lib/auth/current-identity";
import ResourceImportClient from "./ResourceImportClient";

export default async function ResourceImportPage() {
  await requireCurrentRole("ADMIN");
  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <header>
      <p className="text-sm font-semibold text-blue-700">ADMIN resource operations</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-950">Preview metadata CSV</h1>
      <p className="mt-2 text-sm text-slate-600">Review proposed metadata differences using stable resource and catalogue IDs.</p>
    </header>
    <ResourceImportClient />
  </main>;
}
