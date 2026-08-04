import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import { searchPublicResources } from "@/lib/resources/public-resource-search";
import { buildResourceSearchUrl, parseStudentSearchQuery, type RawSearchParams } from "@/lib/resources/resource-search-query";

export const metadata: Metadata = { title: "Search learning resources", alternates: { canonical: "/search" } };
const field = "min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm";

export default async function PublicSearchPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const query = parseStudentSearchQuery(await searchParams);
  let result;
  try { result = await searchPublicResources(query); } catch { return <SearchFailure />; }
  return <><Navbar /><main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12"><header><h1 className="text-4xl font-bold text-slate-950">Search learning resources</h1><p className="mt-3 text-slate-600">Browse published, free resources. Sign in to open protected PDFs, bookmark material, and save progress.</p></header>
    <form action="/search" className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-5">
      <input className={`${field} md:col-span-2`} aria-label="Search resources" name="q" type="search" maxLength={100} defaultValue={query.q} placeholder="Title, chapter or subject" />
      <select className={field} aria-label="Class" name="level" defaultValue={query.level}><option value="">All classes</option>{result.facets.levels.filter((x) => /^class-(?:[6-9]|1[0-2])$/.test(x.slug)).map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</select>
      <select className={field} aria-label="Subject" name="subject" defaultValue={query.subject}><option value="">All subjects</option>{result.facets.subjects.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</select>
      <select className={field} aria-label="Resource type" name="type" defaultValue={query.type}><option value="">All resource types</option>{result.facets.resourceTypes.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</select>
      <div className="flex gap-2 md:col-span-5"><button className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white">Search</button><Link href="/search" className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700">Clear</Link></div>
    </form>
    <p className="mt-7 text-sm font-semibold text-slate-700">{result.pagination.total} {result.pagination.total === 1 ? "resource" : "resources"}</p>
    {result.items.length ? <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{result.items.map((item, index) => <article key={`${item.title}-${item.academicLabel}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-6"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{item.resourceType} · {item.format}</p><h2 className="mt-2 text-xl font-bold text-slate-950">{item.title}</h2><p className="mt-2 text-sm text-slate-500">{item.academicLabel}</p>{item.description ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{item.description}</p> : null}<Link href={item.loginHref} className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Sign in to open</Link></article>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-12 text-center"><h2 className="text-xl font-bold">No resources found</h2><p className="mt-2 text-slate-600">Try a broader search or remove a filter.</p></div>}
    {result.pagination.totalPages > 1 ? <nav aria-label="Search result pages" className="mt-8 flex justify-center gap-3">{result.pagination.page > 1 ? <Link href={buildResourceSearchUrl("/search", query, result.pagination.page - 1)} className="rounded-xl border px-4 py-2">Previous</Link> : null}{result.pagination.page < result.pagination.totalPages ? <Link href={buildResourceSearchUrl("/search", query, result.pagination.page + 1)} className="rounded-xl bg-blue-700 px-4 py-2 text-white">Next</Link> : null}</nav> : null}
  </main><Footer /></>;
}

function SearchFailure() { return <><Navbar /><main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20 text-center"><h1 className="text-3xl font-bold">Resources are temporarily unavailable</h1><p className="mt-3 text-slate-600">Please try again later. No internal error details have been displayed.</p><Link href="/" className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">Return home</Link></main><Footer /></>; }
