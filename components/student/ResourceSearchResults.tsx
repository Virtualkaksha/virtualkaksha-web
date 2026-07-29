import Link from "next/link";

import type { ResourceSearchResultItem } from "@/lib/resources/resource-search";

function formatDate(date: Date | null) {
  return date ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date) : null;
}

export default function ResourceSearchResults({ items }: { items: ResourceSearchResultItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <h2 className="text-xl font-bold text-slate-900">No resources found</h2>
        <p className="mt-2 text-sm text-slate-600">Try a broader search or remove one of the filters.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Link key={item.id} href={item.href} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{item.resourceType.name}</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">FREE</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{item.format.replaceAll("_", " ")}</span>
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900 group-hover:text-blue-700">{item.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.description ?? "Open this resource to continue learning."}</p>
          <p className="mt-4 text-xs leading-5 text-slate-500">{item.academicLabel}</p>
          <div className="mt-auto pt-5 text-xs text-slate-500">
            {item.teacherName ? <p>By {item.teacherName}</p> : null}
            {formatDate(item.publishedAt) ? <p className="mt-1">Published {formatDate(item.publishedAt)}</p> : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
