"use client";

import { useState } from "react";

type ResourceActionsProps = {
  title: string;
  downloadUrl: string | null;
};

export default function ResourceActions({
  title,
  downloadUrl,
}: ResourceActionsProps) {
  const [shareLabel, setShareLabel] = useState("Share");

  async function handleShare() {
    const shareData = {
      title,
      text: `Study ${title} on VirtualKaksha`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      setShareLabel("Link copied");

      window.setTimeout(() => {
        setShareLabel("Share");
      }, 2000);
    } catch {
      setShareLabel("Try again");

      window.setTimeout(() => {
        setShareLabel("Share");
      }, 2000);
    }
  }

  return (
    <div className="flex w-full flex-wrap gap-3 lg:w-auto lg:justify-end">
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/20 lg:flex-none"
      >
        {shareLabel}
      </button>

      {downloadUrl ? (
        <a
          href={downloadUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 lg:flex-none"
        >
          Download
        </a>
      ) : null}
    </div>
  );
}
