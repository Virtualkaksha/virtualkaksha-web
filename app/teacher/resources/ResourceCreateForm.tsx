"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { FileText, Link2, Save, Send, Trash2, UploadCloud } from "lucide-react";

import type { TeacherResourceActionResult } from "./actions";

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
  action: (formData: FormData) => Promise<TeacherResourceActionResult>;
};

const field =
  "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const MAX_PDF_UPLOAD_MB = 20;

type SourceType = "external-url" | "native-pdf";
type UploadUiState = "idle" | "file-selected" | "uploading" | "success" | "validation-error" | "upload-failure" | "retry";

export default function ResourceCreateForm({ chapters, resourceTypes, canPublish, action }: Props) {
  const boards = useMemo(() => [...new Set(chapters.map((c) => c.boardClassSubject.board.shortName))], [chapters]);
  const [board, setBoard] = useState(boards[0] ?? "");
  const classes = useMemo(() => [...new Set(chapters.filter((c) => c.boardClassSubject.board.shortName === board).map((c) => c.boardClassSubject.classLevel.name))], [chapters, board]);
  const [classLevel, setClassLevel] = useState("");
  const subjects = useMemo(() => [...new Set(chapters.filter((c) => c.boardClassSubject.board.shortName === board && (!classLevel || c.boardClassSubject.classLevel.name === classLevel)).map((c) => c.boardClassSubject.subject.name))], [chapters, board, classLevel]);
  const [subject, setSubject] = useState("");
  const filteredChapters = useMemo(() => chapters.filter((c) => c.boardClassSubject.board.shortName === board && (!classLevel || c.boardClassSubject.classLevel.name === classLevel) && (!subject || c.boardClassSubject.subject.name === subject)), [chapters, board, classLevel, subject]);
  const [format, setFormat] = useState("PDF");
  const [sourceType, setSourceType] = useState<SourceType>("external-url");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultState, setResultState] = useState<UploadUiState>("idle");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetBelowBoard(nextBoard: string) { setBoard(nextBoard); setClassLevel(""); setSubject(""); }
  function resetBelowClass(nextClass: string) { setClassLevel(nextClass); setSubject(""); }

  const needsContentUrl = ["PDF", "VIDEO", "IMAGE", "DOCUMENT", "INTERACTIVE"].includes(format);
  const needsExternalUrl = format === "EXTERNAL_LINK";
  const needsArticle = format === "ARTICLE";
  const isPdfNativeUpload = format === "PDF" && sourceType === "native-pdf";

  function updateFormat(nextFormat: string) {
    setFormat(nextFormat);
    if (nextFormat !== "PDF") {
      setSourceType("external-url");
      setSelectedFile(null);
      setFileError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFileError(null);
    setResultMessage(null);
    if (!nextFile) {
      setSelectedFile(null);
      setResultState("idle");
      return;
    }

    if (!nextFile.name.toLowerCase().endsWith(".pdf") || (nextFile.type && nextFile.type !== "application/pdf" && nextFile.type !== "application/x-pdf")) {
      setSelectedFile(null);
      setFileError("Only PDF files are supported in this upload flow.");
      setResultState("validation-error");
      event.target.value = "";
      return;
    }

    if (nextFile.size > MAX_PDF_UPLOAD_MB * 1024 * 1024) {
      setSelectedFile(null);
      setFileError(`The file exceeds the ${MAX_PDF_UPLOAD_MB}MB upload limit.`);
      setResultState("validation-error");
      event.target.value = "";
      return;
    }

    setSelectedFile(nextFile);
    setResultState("file-selected");
  }

  function removeSelectedFile() {
    setSelectedFile(null);
    setResultMessage(null);
    setFileError(null);
    setResultState("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current) {
      return;
    }

    if (isPdfNativeUpload) {
      if (!selectedFile) {
        setFileError("Please choose a PDF file before saving this resource.");
        setResultState("validation-error");
        return;
      }
      setFileError(null);
      setResultState("uploading");
      setResultMessage("Uploading PDF…");
    } else {
      setResultState("idle");
      setResultMessage(null);
    }

    const formData = new FormData(formRef.current);
    if (isPdfNativeUpload && selectedFile) {
      formData.set("file", selectedFile);
    }

    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        setResultState("success");
        setResultMessage(result.message);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        setResultState(result.retryable ? "retry" : "upload-failure");
        setResultMessage(result.message);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-7 space-y-7">
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
          <Field label="Format"><select name="format" value={format} onChange={(e) => updateFormat(e.target.value)} className={field}><option value="PDF">PDF</option><option value="VIDEO">Video</option><option value="ARTICLE">Article</option><option value="IMAGE">Image</option><option value="DOCUMENT">Document</option><option value="EXTERNAL_LINK">External link</option><option value="INTERACTIVE">Interactive</option></select></Field>
          <Field label="Language"><select name="language" className={field} defaultValue="ENGLISH"><option value="ENGLISH">English</option><option value="HINDI">Hindi</option></select></Field>
          <Field label="Access"><select name="access" className={field} defaultValue="FREE"><option value="FREE">Free</option><option value="PREMIUM">Premium</option><option value="ENROLLED_ONLY">Enrolled students only</option></select></Field>
        </div>
        <div className="mt-5"><Field label="Description"><textarea name="description" rows={3} className={field} placeholder="What will the student learn from this resource?" /></Field></div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Step 3 · Content</p>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          {format === "PDF" ? <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-700">Source type</span>
              <select name="sourceType" value={sourceType} onChange={(e) => setSourceType(e.target.value as SourceType)} className={`${field} max-w-xs`}>
                <option value="external-url">External URL</option>
                <option value="native-pdf">Native PDF Upload</option>
              </select>
            </label>
          </div> : null}
          {needsContentUrl && !isPdfNativeUpload ? <Field label={format === "VIDEO" ? "Video URL" : `${format.replaceAll("_", " ")} URL`}><div className="relative"><Link2 className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400"/><input name="contentUrl" type="url" required className={`${field} pl-12`} placeholder={format === "VIDEO" ? "YouTube, Vimeo or hosted video URL" : "https://..."} /></div></Field> : null}
          {needsExternalUrl ? <Field label="External URL"><input name="externalUrl" type="url" required className={field} placeholder="https://..." /></Field> : null}
          {needsArticle ? <Field label="Article content"><textarea name="textContent" required rows={10} className={field} placeholder="Write the complete article here..." /></Field> : null}
          {isPdfNativeUpload ? <div className="mt-5 rounded-2xl border border-dashed border-blue-300 bg-blue-50/70 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Upload a PDF</p>
                <p className="mt-1 text-sm text-slate-600">Only PDF files are accepted. Maximum size is {MAX_PDF_UPLOAD_MB}MB.</p>
              </div>
              <div className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{resultState === "uploading" ? "Uploading" : resultState === "success" ? "Success" : resultState === "retry" ? "Retry" : resultState === "validation-error" ? "Validation error" : resultState === "file-selected" ? "File selected" : "Idle"}</div>
            </div>
            <label htmlFor="resource-pdf-upload" className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-blue-200 bg-white px-4 py-6 text-center transition hover:border-blue-400 hover:bg-blue-50 focus-within:ring-4 focus-within:ring-blue-100">
              <UploadCloud className="h-8 w-8 text-blue-700" />
              <span className="mt-3 text-sm font-semibold text-slate-900">Choose a PDF file</span>
              <span className="mt-1 text-sm text-slate-500">Or drop a PDF here in supported browsers</span>
              <input ref={fileInputRef} id="resource-pdf-upload" name="file" type="file" accept="application/pdf,.pdf" className="sr-only" onChange={handleFileSelection} />
            </label>
            {selectedFile ? <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{selectedFile.name}</p>
                  <p className="text-sm text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <button type="button" onClick={removeSelectedFile} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Trash2 size={16}/> Remove
                </button>
              </div>
            </div> : null}
            {fileError ? <p className="mt-3 text-sm font-semibold text-rose-700">{fileError}</p> : null}
            {resultMessage ? <p className={`mt-3 text-sm font-semibold ${resultState === "success" ? "text-emerald-700" : resultState === "retry" || resultState === "upload-failure" || resultState === "validation-error" ? "text-rose-700" : "text-slate-700"}`}>{resultMessage}</p> : null}
          </div> : null}
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
          <button disabled={isPending} name="status" value="DRAFT" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"><Save size={17}/> {isPending && isPdfNativeUpload ? "Uploading…" : "Save draft"}</button>
          <button disabled={isPending} name="status" value="PENDING_REVIEW" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"><Send size={17}/> {isPending && isPdfNativeUpload ? "Uploading…" : "Submit for review"}</button>
          {canPublish ? <button disabled={isPending} name="status" value="PUBLISHED" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"><FileText size={17}/> {isPending && isPdfNativeUpload ? "Uploading…" : "Publish now"}</button> : null}
        </div>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>{children}</label>;
}
