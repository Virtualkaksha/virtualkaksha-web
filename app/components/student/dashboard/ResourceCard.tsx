import Link from "next/link";
import { ArrowUpRight, Clock3, FileText, PlayCircle } from "lucide-react";

type ResourceCardProps = {
  title: string;
  eyebrow: string;
  meta: string;
  href: string;
  format: string;
};

export default function ResourceCard({
  title,
  eyebrow,
  meta,
  href,
  format,
}: ResourceCardProps) {
  const isVideo = format === "VIDEO";
  const Icon = isVideo ? PlayCircle : FileText;

  return (
    <Link
      href={href}
      className="group flex min-h-52 flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_14px_36px_rgba(15,23,42,0.09)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <ArrowUpRight className="h-5 w-5 text-slate-300 transition group-hover:text-blue-700" aria-hidden="true" />
      </div>

      <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
        {eyebrow}
      </p>
      <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-6 text-slate-950">
        {title}
      </h3>

      <div className="mt-auto flex items-center gap-2 pt-5 text-xs text-slate-500">
        <Clock3 className="h-4 w-4" aria-hidden="true" />
        <span>{meta}</span>
      </div>
    </Link>
  );
}
