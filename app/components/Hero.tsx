import Link from "next/link";

const quickResources = [
  {
    title: "Study Notes",
    description: "Chapter-wise concepts",
    icon: "📘",
    href: "/notes",
    background: "bg-blue-50",
  },
  {
    title: "NCERT Solutions",
    description: "Step-by-step answers",
    icon: "📚",
    href: "/ncert-solutions",
    background: "bg-emerald-50",
  },
  {
    title: "Mock Tests",
    description: "Test your preparation",
    icon: "📝",
    href: "/tests",
    background: "bg-amber-50",
  },
  {
    title: "Video Lectures",
    description: "Learn visually",
    icon: "🎥",
    href: "/video-lectures",
    background: "bg-violet-50",
  },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Decorative background */}
      <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-violet-100/60 blur-3xl" />

      <div className="relative mx-auto grid min-h-[680px] max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-2 lg:py-24">
        {/* Left content */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            <span>✨</span>
            India&apos;s smart learning platform
          </div>

          <h1 className="mt-7 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Learn <span className="text-blue-600">smarter</span> with
            VirtualKaksha
          </h1>

          <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
            Access organised notes, NCERT solutions, video lectures,
            important questions and practice tests—all in one learning
            platform.
          </p>

          {/* CTA buttons */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="#choose-class"
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-7 py-4 font-semibold text-white shadow-lg shadow-blue-600/20 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Start Learning
              <span className="ml-2">→</span>
            </Link>

            <Link
              href="/courses"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-7 py-4 font-semibold text-slate-800 transition duration-300 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              Explore Courses
            </Link>
          </div>

          {/* Trust points — no fake statistics */}
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-600">
            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                ✓
              </span>
              Class-wise learning
            </span>

            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                ✓
              </span>
              Mobile friendly
            </span>

            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                ✓
              </span>
              Practice focused
            </span>
          </div>
        </div>

        {/* Right learning panel */}
        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-blue-100 to-violet-100 opacity-70 blur-2xl" />

          <div className="relative rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10 sm:p-7">
            {/* Panel header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-600">
                  Find what you need
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Search study material
                </h2>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white">
                🔍
              </div>
            </div>

            {/* Search input */}
            <form
              action="/search"
              className="mt-6 flex flex-col gap-3 sm:flex-row"
            >
              <label htmlFor="hero-search" className="sr-only">
                Search study material
              </label>

              <input
                id="hero-search"
                name="query"
                type="search"
                placeholder="Search class, subject or chapter..."
                className="min-w-0 flex-1 rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />

              <button
                type="submit"
                className="rounded-2xl bg-slate-900 px-6 py-4 font-semibold text-white transition hover:bg-blue-700"
              >
                Search
              </button>
            </form>

            {/* Quick access cards */}
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {quickResources.map((resource) => (
                <Link
                  key={resource.title}
                  href={resource.href}
                  className={`group rounded-2xl border border-transparent p-4 transition duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md ${resource.background}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                      {resource.icon}
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 transition group-hover:text-blue-700">
                        {resource.title}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {resource.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Bottom progress preview */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Learning journey
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    Choose class → Subject → Chapter
                  </p>
                </div>

                <div className="flex -space-x-2">
                  {["6", "8", "10", "12"].map((className) => (
                    <span
                      key={className}
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-xs font-bold text-blue-700"
                    >
                      {className}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}