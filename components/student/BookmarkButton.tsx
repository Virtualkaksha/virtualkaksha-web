"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";

export default function BookmarkButton({
  resourceId,
  initialBookmarked,
}: {
  resourceId: string;
  initialBookmarked: boolean;
}) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function toggleBookmark() {
    if (saving) return;
    const next = !bookmarked;
    setBookmarked(next);
    setSaving(true);
    setError(false);
    try {
      const response = await fetch(`/api/student/resources/${encodeURIComponent(resourceId)}/bookmark`, {
        method: next ? "PUT" : "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Bookmark update failed");
      router.refresh();
    } catch {
      setBookmarked(!next);
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggleBookmark}
        disabled={saving}
        aria-label={bookmarked ? "Remove bookmark" : "Bookmark resource"}
        aria-pressed={bookmarked}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-wait disabled:opacity-60"
      >
        <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current text-blue-700" : ""}`} aria-hidden="true" />
      </button>
      {error ? <span role="status" className="text-[11px] font-medium text-amber-700">Try again</span> : null}
    </div>
  );
}
