"use client";

import { useActionState, useMemo, useState } from "react";

import { COMBINED_CHAPTER_MAX, COMBINED_CHAPTER_MIN, type PracticeTestKind } from "@/lib/practice-tests/generation";
import { startStudentPracticeTest, type StartTestActionState } from "./actions";

type Catalogue = {
  boards: Array<{ id: string; shortName: string }>;
  levels: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; name: string }>;
  chapters: Array<{
    id: string;
    name: string;
    chapterNumber: number | null;
    boardClassSubject: {
      board: { id: string };
      classLevel: { id: string };
      subject: { id: string };
    };
  }>;
};

const kinds: Array<{ value: PracticeTestKind; label: string; hint: string }> = [
  { value: "CHAPTER", label: "Chapter test", hint: "Questions from one chapter." },
  { value: "COMBINED_CHAPTER", label: "Combined chapter test", hint: "Mix questions from two or three chapters." },
  { value: "SUBJECT", label: "Subject test", hint: "Questions from the whole subject." },
  { value: "FULL_CLASS", label: "Full class test", hint: "Questions from every subject in this class." },
];

const field = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function TestSetupForm({ catalogue, defaultBoardId, defaultClassLevelId }: { catalogue: Catalogue; defaultBoardId?: string; defaultClassLevelId?: string }) {
  const [state, action, pending] = useActionState(startStudentPracticeTest, { status: "idle" } satisfies StartTestActionState);
  const [boardId, setBoardId] = useState(defaultBoardId ?? catalogue.boards[0]?.id ?? "");
  const [classLevelId, setClassLevelId] = useState(defaultClassLevelId ?? catalogue.levels[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState("");
  const [kind, setKind] = useState<PracticeTestKind>("CHAPTER");
  const [chapterId, setChapterId] = useState("");
  const [combinedIds, setCombinedIds] = useState<string[]>([]);

  const subjects = useMemo(() => {
    const ids = new Set(
      catalogue.chapters
        .filter((chapter) => chapter.boardClassSubject.board.id === boardId && chapter.boardClassSubject.classLevel.id === classLevelId)
        .map((chapter) => chapter.boardClassSubject.subject.id),
    );
    return catalogue.subjects.filter((subject) => ids.has(subject.id));
  }, [catalogue, boardId, classLevelId]);

  const chapters = useMemo(
    () =>
      catalogue.chapters.filter(
        (chapter) =>
          chapter.boardClassSubject.board.id === boardId
          && chapter.boardClassSubject.classLevel.id === classLevelId
          && (!subjectId || chapter.boardClassSubject.subject.id === subjectId),
      ),
    [catalogue, boardId, classLevelId, subjectId],
  );

  const needsSubject = kind !== "FULL_CLASS";
  const needsOneChapter = kind === "CHAPTER";
  const needsCombined = kind === "COMBINED_CHAPTER";

  function toggleCombined(id: string) {
    setCombinedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= COMBINED_CHAPTER_MAX) return current;
      return [...current, id];
    });
  }

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Board</span>
          <select name="boardId" value={boardId} onChange={(event) => { setBoardId(event.target.value); setSubjectId(""); setChapterId(""); setCombinedIds([]); }} className={field}>
            {catalogue.boards.map((board) => <option key={board.id} value={board.id}>{board.shortName}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Class</span>
          <select name="classLevelId" value={classLevelId} onChange={(event) => { setClassLevelId(event.target.value); setSubjectId(""); setChapterId(""); setCombinedIds([]); }} className={field}>
            {catalogue.levels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
          </select>
        </label>
      </div>

      <label>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Test type</span>
        <select name="kind" value={kind} onChange={(event) => { setKind(event.target.value as PracticeTestKind); setChapterId(""); setCombinedIds([]); }} className={field}>
          {kinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <p className="mt-2 text-sm text-slate-600">{kinds.find((item) => item.value === kind)?.hint}</p>
      </label>

      {needsSubject ? (
        <label>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</span>
          <select name="subjectId" value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setChapterId(""); setCombinedIds([]); }} className={field} required>
            <option value="">Select subject</option>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
      ) : <input type="hidden" name="subjectId" value="" />}

      {needsOneChapter ? (
        <label>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Chapter</span>
          <select name="chapterIds" value={chapterId} onChange={(event) => setChapterId(event.target.value)} className={field} required>
            <option value="">Select chapter</option>
            {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.chapterNumber ? `${chapter.chapterNumber}. ` : ""}{chapter.name}</option>)}
          </select>
        </label>
      ) : null}

      {needsCombined ? (
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Chapters ({COMBINED_CHAPTER_MIN}–{COMBINED_CHAPTER_MAX})</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {chapters.map((chapter) => (
              <label key={chapter.id} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm">
                <input type="checkbox" name="chapterIds" value={chapter.id} checked={combinedIds.includes(chapter.id)} onChange={() => toggleCombined(chapter.id)} />
                {chapter.chapterNumber ? `${chapter.chapterNumber}. ` : ""}{chapter.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {state.status === "error" && state.message ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{state.message}</p>
      ) : null}

      <button type="submit" disabled={pending} className="min-h-12 rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
        {pending ? "Preparing test..." : "Start test"}
      </button>
    </form>
  );
}
