import type { ResourceSearchResultItem } from "@/lib/resources/resource-search";
import StudentResourceCard from "./StudentResourceCard";

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
      {items.map((item) => <StudentResourceCard key={item.id} item={item} bookmarked={item.bookmarked} />)}
    </div>
  );
}
