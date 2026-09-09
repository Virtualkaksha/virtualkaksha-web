"use client";

import { useMemo, useState, useTransition } from "react";

import { createTeacherPracticeQuestion } from "./actions";

type ChapterOption = {
  id: string;
  name: string;
  chapterNumber: number | null;
  boardClassSubject: {
    board: { shortName: string };
    classLevel: { name: string };
    subject: { name: string };
  };
};

const field = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function QuestionCreateForm({ chapters }: { chapters: ChapterOption[] }) {
  const boards = useMemo(() => [...new Set(chapters.map((chapter) => chapter.boardClassSubject.board.shortName))], [chapters]);
  const [board, setBoard] = useState(boards[0] ?? "");
  const classes = useMemo(() => [...new Set(chapters.filter((chapter) => chapter.boardClassSubject.board.shortName === board).map((chapter) => chapter.boardClassSubject.classLevel.name))], [chapters, board]);
  const [classLevel, setClassLevel] = useState("");
  const subjects = useMemo(() => [...new Set(chapters.filter((chapter) => chapter.boardClassSubject.board.shortName === board && (!classLevel || chapter.boardClassSubject.classLevel.name === classLevel)).map((chapter) => chapter.boardClassSubject.subject.name))], [chapters, board, classLevel]);
  const [subject, setSubject] = useState("");
  const filtered = useMemo(() => chapters.filter((chapter) => chapter.boardClassSubject.board.shortName === board && (!classLevel || chapter.boardClassSubject.classLevel.name === classLevel) && (!subject || chapter.boardClassSubject.subject.name === subject)), [chapters, board, classLevel, subject]);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        startTransition(async () => {
          const result = await createTeacherPracticeQuestion(formData);
          setOk(result.ok);
          setMessage(result.message);
          if (result.ok) form.reset();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <label>
          <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">Board</span>
          <select value={board} onChange={(event) => { setBoard(event.target.value); setClassLevel(""); setSubject(""); }} className={field}>
            {boards.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">Class</span>
          <select value={classLevel} onChange={(event) => { setClassLevel(event.target.value); setSubject(""); }} className={field}>
            <option value="">All</option>
            {classes.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">Subject</span>
          <select value={subject} onChange={(event) => setSubject(event.target.value)} className={field}>
            <option value="">All</option>
            {subjects.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <label>
        <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">Chapter</span>
        <select name="chapterId" required className={field}>
          <option value="">Select chapter</option>
          {filtered.map((chapter) => (
            <option key={chapter.id} value={chapter.id}>
              {chapter.boardClassSubject.classLevel.name} · {chapter.boardClassSubject.subject.name} · {chapter.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">Question</span>
        <textarea name="prompt" required minLength={8} rows={3} className={field} placeholder="Write the question students will see." />
      </label>
      {["optionA", "optionB", "optionC", "optionD"].map((name, index) => (
        <label key={name}>
          <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">Option {String.fromCharCode(65 + index)}</span>
          <input name={name} required className={field} />
        </label>
      ))}
      <label>
        <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">Correct option</span>
        <select name="correctOption" required className={field} defaultValue="0">
          <option value="0">A</option>
          <option value="1">B</option>
          <option value="2">C</option>
          <option value="3">D</option>
        </select>
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">Explanation (optional)</span>
        <textarea name="explanation" rows={2} className={field} />
      </label>
      {message ? <p className={`rounded-xl px-4 py-3 text-sm ${ok ? "border border-emerald-200 bg-emerald-50 text-emerald-900" : "border border-amber-200 bg-amber-50 text-amber-900"}`}>{message}</p> : null}
      <button type="submit" disabled={pending} className="min-h-12 rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving..." : "Submit question"}
      </button>
    </form>
  );
}
