import Link from "next/link";

import BookmarkButton from "./BookmarkButton";

type StudentResourceCardProps = {
  item: {
    id: string;
    title: string;
    description?: string | null;
    format: string;
    href: string;
    academicLabel: string;
    resourceType: { name: string };
    progress?: null | {
      status: string;
      percent: number;
      lastPosition: number | null;
      lastAccessedAt: Date | null;
    };
  };
  bookmarked: boolean;
  showBookmark?: boolean;
};

function progressStatus(status: string) {
  return status === "COMPLETED" ? "Completed" : status === "IN_PROGRESS" ? "In progress" : "Not started";
}

export default function StudentResourceCard({ item, bookmarked, showBookmark = true }: StudentResourceCardProps) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{item.resourceType.name}</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">FREE</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{item.format.replaceAll("_", " ")}</span>
        </div>
        {showBookmark ? <BookmarkButton resourceId={item.id} initialBookmarked={bookmarked} /> : null}
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-900">{item.title}</h2>
      {item.description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{item.description}</p> : null}
      <p className="mt-4 text-xs leading-5 text-slate-500">{item.academicLabel}</p>
      {item.progress ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>{progressStatus(item.progress.status)}{item.progress.lastPosition ? ` · Page ${item.progress.lastPosition}` : ""}</span>
            <span>{item.progress.percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-700" style={{ width: `${item.progress.percent}%` }} />
          </div>
        </div>
      ) : null}
      <div className="mt-auto pt-5">
        {item.href === "#" ? (
          <span className="inline-flex min-h-10 items-center rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-500">Unavailable</span>
        ) : (
          <Link href={item.href} className="inline-flex min-h-10 items-center rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800">
            {item.progress ? "Resume" : "Open resource"}
          </Link>
        )}
      </div>
    </article>
  );
}
