import Link from "next/link";
import type { ReactNode } from "react";

import { requireCurrentRole } from "@/lib/auth/current-identity";
import { getResourceInventory, parseResourceInventoryFilters } from "@/lib/admin/resource-inventory";

type SearchParams = Record<string, string | string[] | undefined>;

function queryString(filters: ReturnType<typeof parseResourceInventoryFilters>, page?: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, page: page ?? filters.page })) {
    if (value !== "" && value !== false && key !== "pageSize") params.set(key, String(value));
  }
  return params.toString();
}

function Badge({ children, tone = "amber" }: { children: ReactNode; tone?: "amber" | "rose" | "blue" }) {
  const colors = tone === "rose" ? "bg-rose-100 text-rose-800" : tone === "blue" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800";
  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${colors}`}>{children}</span>;
}

export default async function ResourceInventoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireCurrentRole("ADMIN");
  const filters = parseResourceInventoryFilters(await searchParams);
  let inventory: Awaited<ReturnType<typeof getResourceInventory>> | null = null;
  try { inventory = await getResourceInventory(filters); } catch { inventory = null; }

  return <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div><p className="text-sm font-semibold text-blue-700">Read-only resource operations</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Resource inventory</h1><p className="mt-2 text-sm text-slate-600">Review metadata and asset health without changing resources or storage.</p></div>
      <div className="flex gap-3"><Link href="/admin/resources" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">Moderation</Link><a href={`/admin/resources/export?${queryString(filters, 1)}`} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Export CSV</a></div>
    </header>

    <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <select name="status" defaultValue={filters.status} className="rounded-lg border p-2"><option value="">All statuses</option>{["DRAFT","PENDING_REVIEW","PUBLISHED","REJECTED","ARCHIVED"].map((x)=><option key={x}>{x}</option>)}</select>
      <select name="board" defaultValue={filters.board} className="rounded-lg border p-2"><option value="">All boards</option>{inventory?.facets.boards.map((x)=><option key={x.slug} value={x.slug}>{x.shortName}</option>)}</select>
      <select name="level" defaultValue={filters.level} className="rounded-lg border p-2"><option value="">All classes</option>{inventory?.facets.levels.map((x)=><option key={x.slug} value={x.slug}>{x.name}</option>)}</select>
      <select name="subject" defaultValue={filters.subject} className="rounded-lg border p-2"><option value="">All subjects</option>{inventory?.facets.subjects.map((x)=><option key={x.slug} value={x.slug}>{x.name}</option>)}</select>
      <select name="resourceType" defaultValue={filters.resourceType} className="rounded-lg border p-2"><option value="">All types</option>{inventory?.facets.resourceTypes.map((x)=><option key={x.slug} value={x.slug}>{x.name}</option>)}</select>
      <select name="language" defaultValue={filters.language} className="rounded-lg border p-2"><option value="">All languages</option><option>ENGLISH</option><option>HINDI</option></select>
      <select name="access" defaultValue={filters.access} className="rounded-lg border p-2"><option value="">All access</option><option>FREE</option><option>PREMIUM</option><option>ENROLLED_ONLY</option></select>
      <select name="assetHealth" defaultValue={filters.assetHealth} className="rounded-lg border p-2"><option value="">All asset health</option>{["READY","MISSING","NON_READY","LEGACY","NO_SOURCE"].map((x)=><option key={x}>{x}</option>)}</select>
      {[["missingDescription","Missing description"],["duplicateTitle","Duplicate title"],["duplicateChecksum","Duplicate checksum"],["legacySource","Legacy source"]].map(([name,label])=><label key={name} className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} value="true" defaultChecked={filters[name as keyof typeof filters] === true}/>{label}</label>)}
      <button className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Apply filters</button>
    </form>

    {!inventory ? <section className="rounded-2xl border border-rose-200 bg-white p-10 text-center"><h2 className="font-bold text-slate-900">Inventory unavailable</h2><p className="mt-2 text-sm text-slate-600">The read-only inventory could not be loaded. Try again later.</p></section> : <>
      <section className="flex flex-wrap gap-3 text-sm"><Badge tone="blue">{inventory.total} matching resources</Badge><Badge>{inventory.duplicateTitleGroupCount} duplicate-title groups</Badge><Badge>{inventory.duplicateChecksumGroupCount} duplicate-checksum groups</Badge><span className="text-slate-500">Page {inventory.page} of {inventory.totalPages}</span></section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="min-w-[1800px] text-left text-xs"><thead className="bg-slate-50 uppercase tracking-wide text-slate-500"><tr>{["Resource","ID","Academic mapping","Type / format","Lifecycle","Uploader","Asset","Counts","File","Dates","Warnings"].map((x)=><th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
        {inventory.rows.map((row)=><tr key={row.id} className="align-top"><td className="px-4 py-4"><p className="font-semibold text-slate-950">{row.title}</p>{row.titleHindi&&<p className="mt-1 text-slate-600">{row.titleHindi}</p>}<p className="mt-1 max-w-xs text-slate-500">{row.description||"No description"}</p></td><td className="px-4 py-4"><code className="select-all rounded bg-slate-100 px-2 py-1">{row.id}</code></td><td className="px-4 py-4">{row.board} · {row.level}<br/>{row.subject} · {row.unit}</td><td className="px-4 py-4">{row.resourceType}<br/>{row.format} · {row.language} · {row.access}</td><td className="px-4 py-4"><Badge tone="blue">{row.status}</Badge><p className="mt-2">Version {row.version}</p></td><td className="px-4 py-4">{row.uploader}</td><td className="px-4 py-4">{row.assetSource}<br/><span className="font-semibold">{row.assetState}</span><br/>Primary: {row.primaryAssetAvailable?"Yes":"No"}<br/>Checksum: {row.checksumPresent?"Yes":"No"}</td><td className="px-4 py-4">Bookmarks: {row.bookmarkCount}<br/>Progress: {row.progressCount}</td><td className="px-4 py-4">Pages: {row.pageCount??"—"}<br/>Bytes: {row.fileSizeBytes??"—"}</td><td className="px-4 py-4">Created {new Date(row.createdAt).toLocaleDateString()}<br/>Updated {new Date(row.updatedAt).toLocaleDateString()}</td><td className="px-4 py-4"><div className="flex max-w-52 flex-wrap gap-1">{row.missingDescription&&<Badge>Missing description</Badge>}{row.duplicateTitle&&<Badge>Duplicate title</Badge>}{row.duplicateChecksum&&<Badge>Duplicate checksum</Badge>}{row.legacySource&&<Badge>Legacy PDF source</Badge>}{row.assetState==="MISSING"&&<Badge>Missing native asset</Badge>}{row.assetState==="NON_READY"&&<Badge tone="rose">Non-ready asset</Badge>}{row.assetState==="NO_SOURCE"&&<Badge tone="rose">No usable source</Badge>}</div><div className="mt-3 flex gap-3"><Link href={`/admin/resources/${row.id}`} className="font-semibold text-blue-700">Moderation</Link><Link href={`/admin/resources/${row.id}/edit`} className="font-semibold text-blue-700">Edit metadata</Link></div></td></tr>)}
        {!inventory.rows.length&&<tr><td colSpan={11} className="px-6 py-14 text-center text-slate-500">No resources match these validated filters.</td></tr>}
      </tbody></table></div></section>
      <nav className="flex justify-center gap-3">{inventory.page>1&&<Link href={`/admin/resources/inventory?${queryString(filters,inventory.page-1)}`} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">Previous</Link>}{inventory.page<inventory.totalPages&&<Link href={`/admin/resources/inventory?${queryString(filters,inventory.page+1)}`} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Next</Link>}</nav>
    </>}
  </main>;
}
