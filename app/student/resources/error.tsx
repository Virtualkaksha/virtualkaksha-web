"use client";

type StudentResourcesErrorProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function StudentResourcesError({
  error,
  reset,
}: StudentResourcesErrorProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <section className="rounded-3xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl"
          aria-hidden="true"
        >
          ⚠️
        </div>

        <h1 className="mt-5 text-2xl font-bold text-slate-900">
          Resources could not be loaded
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
          VirtualKaksha could not connect to the learning catalogue. Check the
          database connection and try again.
        </p>

        {process.env.NODE_ENV === "development" ? (
          <pre className="mt-5 overflow-x-auto rounded-xl bg-slate-950 p-4 text-left text-xs text-red-200">
            {error.message}
          </pre>
        ) : null}

        <button
          type="button"
          onClick={reset}
          className="mt-6 min-h-11 rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          Try again
        </button>
      </section>
    </div>
  );
}