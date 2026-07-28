"use client";

import { useMemo, useState } from "react";
import { FileText, Link2, Save, Send, Video } from "lucide-react";

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

type ResourceTypeOption = { id: string; name: string; code: string };

type Props = {
  chapters: ChapterOption[];
  resourceTypes: ResourceTypeOption[];
  canPublish: boolean;
  action: (formData: FormData) => void | Promise<void>;
};

const field =
  "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function ResourceCreateForm({ chapters, resourceTypes, canPublish, action }: Props) {
  const boards = useMemo(() => [...new Set(chapters.map((c) => c.boardClassSubject.board.shortName))], [chapters]);
  const [board, setBoard] = useState(boards[0] ?? "");
  const classes = useMemo(() => [...new Set(chapters.filter((c) => c.boardClassSubject.board.shortName === board).map((c) => c.boardClassSubject.classLevel.name))], [chapters, board]);
  const [classLevel, setClassLevel] = useState("");
  const subjects = useMemo(() => [...new Set(chapters.filter((c) => c.boardClassSubject.board.shortName === board && (!classLevel || c.boardClassSubject.classLevel.name === classLevel)).map((c) => c.boardClassSubject.subject.name))], [chapters, board, classLevel]);
  const [subject, setSubject] = useState("");
  const filteredChapters = useMemo(() => chapters.filter((c) => c.boardClassSubject.board.shortName === board && (!classLevel || c.boardClassSubject.classLevel.name === classLevel) && (!subject || c.boardClassSubject.subject.name === subject)), [chapters, board, classLevel, subject]);
  const [format, setFormat] = useState("PDF");

  function resetBelowBoard(nextBoard: string) { setBoard(nextBoard); setClassLevel(""); setSubject(""); }
  function resetBelowClass(nextClass: string) { setClassLevel(nextClass); setSubject(""); }

  const needsContentUrl = ["PDF", "VIDEO", "IMAGE", "DOCUMENT", "INTERACTIVE"].includes(format);
  const needsExternalUrl = format === "EXTERNAL_LINK";
  const needsArticle = format === "ARTICLE";

  return (
    <form action={action} className="mt-7 space-y-7">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Step 1 · Placement</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Board"><select value={board} onChange={(e) => resetBelowBoard(e.target.value)} className={field}>{boards.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Class"><select value={classLevel} onChange={(e) => resetBelowClass(e.target.value)} className={field}><option value="">Select class</option>{classes.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Subject"><select value={subject} onChange={(e) => setSubject(e.target.value)} className={field}><option value="">Select subject</option>{subjects.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Chapter"><select key={`${board}-${classLevel}-${subject}`} name="chapterId" required defaultValue="" className={field}><option value="" disabled>Select chapter</option>{filteredChapters.map((c) => <option key={c.id} value={c.id}>{c.chapterNumber ? `${c.chapterNumber}. ` : ""}{c.name}</option>)}</select></Field>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Step 2 · Resource details</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <Field label="Title"><input name="title" required className={field} placeholder="Chemical Reactions revision notes" /></Field>
          <Field label="Hindi title (optional)"><input name="titleHindi" className={field} placeholder="केवल जरूरत होने पर" /></Field>
          <Field label="Resource type"><select name="resourceTypeId" required defaultValue="" className={field}><option value="" disabled>Select type</option>{resourceTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
          <Field label="Format"><select name="format" value={format} onChange={(e) => setFormat(e.target.value)} className={field}><option value="PDF">PDF</option><option value="VIDEO">Video</option><option value="ARTICLE">Article</option><option value="IMAGE">Image</option><option value="DOCUMENT">Document</option><option value="EXTERNAL_LINK">External link</option><option value="INTERACTIVE">Interactive</option></select></Field>
          <Field label="Language"><select name="language" className={field} defaultValue="ENGLISH"><option value="ENGLISH">English</option><option value="HINDI">Hindi</option></select></Field>
          <Field label="Access"><select name="access" className={field} defaultValue="FREE"><option value="FREE">Free</option><option value="PREMIUM">Premium</option><option value="ENROLLED_ONLY">Enrolled students only</option></select></Field>
        </div>
        <div className="mt-5"><Field label="Description"><textarea name="description" rows={3} className={field} placeholder="What will the student learn from this resource?" /></Field></div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Step 3 · Content</p>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          {needsContentUrl ? <Field label={format === "VIDEO" ? "Video URL" : `${format.replaceAll("_", " ")} URL`}><div className="relative"><Link2 className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400"/><input name="contentUrl" type="url" required className={`${field} pl-12`} placeholder={format === "VIDEO" ? "YouTube, Vimeo or hosted video URL" : "https://..."} /></div></Field> : null}
          {needsExternalUrl ? <Field label="External URL"><input name="externalUrl" type="url" required className={field} placeholder="https://..." /></Field> : null}
          {needsArticle ? <Field label="Article content"><textarea name="textContent" required rows={10} className={field} placeholder="Write the complete article here..." /></Field> : null}
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <Field label="Thumbnail URL (optional)"><input name="thumbnailUrl" type="url" className={field} placeholder="https://...image" /></Field>
            <Field label="Pages"><input name="pageCount" type="number" min="0" className={field} /></Field>
            <Field label="Duration (minutes)"><input name="durationMinutes" type="number" min="0" className={field} /></Field>
          </div>
          <input type="hidden" name="sortOrder" value="0" />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">Drafts remain private. Submitted resources wait for review before appearing on the student site.</p>
        <div className="flex flex-wrap gap-3">
          <button name="status" value="DRAFT" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-800 hover:bg-slate-50"><Save size={17}/> Save draft</button>
          <button name="status" value="PENDING_REVIEW" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800"><Send size={17}/> Submit for review</button>
          {canPublish ? <button name="status" value="PUBLISHED" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800"><FileText size={17}/> Publish now</button> : null}
        </div>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>{children}</label>;
}
