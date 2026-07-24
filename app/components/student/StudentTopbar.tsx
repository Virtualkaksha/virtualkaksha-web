export default function StudentTopbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-20 items-center justify-between gap-4 px-5 sm:px-8">
        <div>
          <p className="text-sm text-slate-500">Welcome back</p>

          <h1 className="text-lg font-semibold text-slate-900">
            Continue your learning
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-lg transition hover:bg-slate-50"
          >
            🔔
          </button>

          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-700 font-semibold text-white">
            A
          </div>
        </div>
      </div>
    </header>
  );
}