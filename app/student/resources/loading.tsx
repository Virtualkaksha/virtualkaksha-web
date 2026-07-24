export default function StudentResourcesLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-10">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="mt-4 h-10 max-w-2xl rounded bg-slate-200" />
        <div className="mt-4 h-5 max-w-3xl rounded bg-slate-100" />

        <div className="mt-8 rounded-2xl bg-slate-50 p-4">
          <div className="h-4 w-48 rounded bg-slate-200" />

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="h-12 flex-1 rounded-xl bg-slate-200" />
            <div className="h-12 w-full rounded-xl bg-slate-300 sm:w-28" />
          </div>
        </div>
      </section>

      <section>
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="mt-3 h-8 w-80 max-w-full rounded bg-slate-200" />

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-64 rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="h-12 w-12 rounded-xl bg-slate-200" />
              <div className="mt-6 h-6 w-32 rounded bg-slate-200" />
              <div className="mt-3 h-4 w-full rounded bg-slate-100" />
              <div className="mt-2 h-4 w-4/5 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}