"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { getAcademicUnitOptions, type ResourceSearchQuery } from "@/lib/resources/resource-search-query";

type Facets = {
  boards: Array<{ name: string; shortName: string; slug: string }>;
  exams: Array<{ name: string; shortName: string; slug: string }>;
  levels: Array<{ name: string; slug: string }>;
  subjects: Array<{ name: string; slug: string }>;
  chapters: Array<{
    name: string;
    slug: string;
    boardClassSubject?: {
      board: { slug: string };
      classLevel: { slug: string };
      subject: { name: string; slug: string };
    };
  }>;
  examTopics: Array<{ name: string; slug: string; examSubject: { exam: { slug: string }; subject: { name: string; slug: string } } }>;
  resourceTypes: Array<{ name: string; slug: string }>;
};

const fieldClass = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function inferTrackType(track: string, facets: Facets) {
  if (!track) return "";
  const isBoard = facets.boards.some((item) => item.slug === track);
  const isExam = facets.exams.some((item) => item.slug === track);
  if (isBoard && !isExam) return "BOARD";
  if (isExam && !isBoard) return "EXAM";
  return "";
}

export default function ResourceSearchForm({
  query,
  facets,
  lockedClass = null,
}: {
  query: ResourceSearchQuery;
  facets: Facets;
  lockedClass?: { boardSlug: string; boardName: string; classSlug: string; className: string } | null;
}) {
  const [trackType, setTrackType] = useState(lockedClass ? "BOARD" : query.trackType ?? inferTrackType(query.track, facets));
  const [track, setTrack] = useState(lockedClass?.boardSlug ?? query.track);
  const [level, setLevel] = useState(lockedClass?.classSlug ?? query.level);
  const [subject, setSubject] = useState(query.subject);
  const [chapter, setChapter] = useState(query.chapter);

  const academicUnits = useMemo(
    () => getAcademicUnitOptions({ trackType: trackType === "BOARD" || trackType === "EXAM" ? trackType : null, track, level, subject }, facets),
    [trackType, track, level, subject, facets],
  );
  const visibleSubjects = useMemo(() => {
    if (trackType === "EXAM") return facets.subjects;
    const allowed = new Set(
      facets.chapters
        .filter((item) => {
          const mapping = item.boardClassSubject;
          if (!mapping) return true;
          if (track && mapping.board.slug !== track) return false;
          if (level && mapping.classLevel.slug !== level) return false;
          return true;
        })
        .map((item) => item.boardClassSubject?.subject.slug)
        .filter((slug): slug is string => Boolean(slug)),
    );
    if (allowed.size === 0) {
      if (level || track) return facets.subjects.filter((item) => item.slug === subject);
      return facets.subjects;
    }
    return facets.subjects.filter((item) => allowed.has(item.slug) || item.slug === subject);
  }, [facets, trackType, track, level, subject]);

  function updateTrack(nextTrack: string) {
    setTrack(nextTrack);
    const inferred = inferTrackType(nextTrack, facets);
    if (inferred) setTrackType(inferred);
    setChapter("");
  }

  return (
    <form action="/student/resources/search" method="get" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label className="md:col-span-2 xl:col-span-4">
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">Search resources</span>
        <input name="q" type="search" defaultValue={query.q} maxLength={100} placeholder="Title, chapter, subject or teacher" className={fieldClass} />
      </label>
      {lockedClass ? (
        <>
          <input type="hidden" name="trackType" value="BOARD" />
          <input type="hidden" name="track" value={lockedClass.boardSlug} />
          <input type="hidden" name="level" value={lockedClass.classSlug} />
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950 md:col-span-2 xl:col-span-4">
            Showing {lockedClass.boardName} {lockedClass.className} only. Change class from{" "}
            <Link href="/student/profile" className="font-semibold underline-offset-2 hover:underline">My Profile</Link>.
          </div>
        </>
      ) : (
        <>
      <label>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Track type</span>
        <select name="trackType" value={trackType} onChange={(event) => { setTrackType(event.target.value); setChapter(""); }} className={fieldClass}>
          <option value="">All track types</option>
          <option value="BOARD">School board</option>
          <option value="EXAM">Competitive exam</option>
        </select>
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Track</span>
        <select name="track" value={track} onChange={(event) => updateTrack(event.target.value)} className={fieldClass}>
          <option value="">All tracks</option>
          <optgroup label="School boards">
            {facets.boards.map((item) => <option key={`board-${item.slug}`} value={item.slug}>{item.shortName}</option>)}
          </optgroup>
          <optgroup label="Competitive exams">
            {facets.exams.map((item) => <option key={`exam-${item.slug}`} value={item.slug}>{item.shortName}</option>)}
          </optgroup>
        </select>
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Class</span>
        <select name="level" value={level} onChange={(event) => { setLevel(event.target.value); setChapter(""); }} className={fieldClass}>
          <option value="">All classes</option>
          {facets.levels.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
        </select>
      </label>
        </>
      )}
      <label>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</span>
        <select name="subject" value={subject} onChange={(event) => { setSubject(event.target.value); setChapter(""); }} className={fieldClass}>
          <option value="">All subjects</option>
          {visibleSubjects.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
        </select>
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{academicUnits.label}</span>
        <select name="chapter" value={chapter} onChange={(event) => setChapter(event.target.value)} className={fieldClass}>
          <option value="">All {academicUnits.label.toLowerCase()}s</option>
          {academicUnits.options.map((item, index) => <option key={`${item.slug}-${index}`} value={item.slug}>{item.name}</option>)}
        </select>
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Resource type</span>
        <select name="type" defaultValue={query.type} className={fieldClass}>
          <option value="">All resource types</option>
          {facets.resourceTypes.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
        </select>
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Access</span>
        <select name="access" defaultValue="FREE" className={fieldClass}>
          <option value="FREE">Free</option>
        </select>
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Sort</span>
        <select name="sort" defaultValue={query.sort} className={fieldClass}>
          <option value="relevance">Curated order</option>
          <option value="newest">Newest</option>
          <option value="alphabetical">Alphabetical</option>
        </select>
      </label>
      <input type="hidden" name="pageSize" value={query.pageSize} />
      <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4">
        <button className="min-h-11 rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white transition hover:bg-blue-800">Search</button>
        <Link href={lockedClass ? `/student/resources/search?track=${lockedClass.boardSlug}&trackType=BOARD&level=${lockedClass.classSlug}` : "/student/resources/search"} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Clear</Link>
      </div>
    </form>
  );
}
