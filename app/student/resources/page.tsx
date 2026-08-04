import Link from "next/link";

const learningTracks = [
  {
    title: "CBSE",
    description:
      "Class 6 to 12 notes, NCERT solutions, videos, important questions and tests.",
    href: "/student/resources/cbse",
    icon: "📘",
    tag: "School Board",
  },
  {
    title: "ICSE",
    description:
      "Structured study resources for ICSE students across classes and subjects.",
    href: "/student/resources/icse",
    icon: "📗",
    tag: "School Board",
  },
  {
    title: "State Boards",
    description:
      "Explore board-wise resources for supported state education boards.",
    href: "/student/resources/state-boards",
    icon: "🏫",
    tag: "School Board",
  },
  {
    title: "JEE",
    description:
      "Physics, Chemistry and Mathematics resources for JEE preparation.",
    href: "/student/resources/jee",
    icon: "⚙️",
    tag: "Competitive Exam",
  },
  {
    title: "NEET",
    description:
      "Biology, Physics and Chemistry learning resources for NEET preparation.",
    href: "/student/resources/neet",
    icon: "🧬",
    tag: "Competitive Exam",
  },
  {
    title: "CUET",
    description:
      "Subject-wise preparation resources, practice material and tests for CUET.",
    href: "/student/resources/cuet",
    icon: "🎯",
    tag: "Competitive Exam",
  },
];

const resourceTypes = [
  {
    title: "Notes",
    description: "Chapter-wise explanations and revision notes.",
    icon: "📄",
  },
  {
    title: "NCERT Solutions",
    description: "Step-by-step textbook exercise solutions.",
    icon: "📘",
  },
  {
    title: "Video Lectures",
    description: "Learn from different teachers and teaching styles.",
    icon: "🎥",
  },
  {
    title: "Important Questions",
    description: "Exam-focused questions selected chapter-wise.",
    icon: "❓",
  },
  {
    title: "Previous Year Papers",
    description: "Practice with earlier board and entrance papers.",
    icon: "📚",
  },
  {
    title: "Practice Tests",
    description: "Chapter, subject and full syllabus assessments.",
    icon: "📝",
  },
];

export default function StudentResourcesPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
            Study Resources
          </p>

          <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            Choose your board or exam and start learning.
          </h1>

          <p className="mt-4 text-base leading-7 text-slate-600">
            Find notes, solutions, videos, previous year papers, important
            questions and tests organised by class, subject and chapter.
          </p>
        </div>

        <div className="mt-7 rounded-2xl bg-slate-50 p-4">
          <label
            htmlFor="resource-search"
            className="text-sm font-semibold text-slate-700"
          >
            Search resources
          </label>

          <form action="/student/resources/search" method="get" className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="resource-search"
              name="q"
              type="search"
              placeholder="Search a chapter, subject, resource or exam"
              className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            <button
              type="submit"
              className="min-h-12 rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <section>
        <div>
          <p className="text-sm font-semibold text-blue-700">
            Select learning track
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Boards and competitive exams
          </h2>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {learningTracks.map((track) => (
            <Link
              key={track.title}
              href={track.href}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                  {track.icon}
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {track.tag}
                </span>
              </div>

              <h3 className="mt-5 text-xl font-semibold text-slate-900">
                {track.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {track.description}
              </p>

              <p className="mt-5 text-sm font-semibold text-blue-700">
                Explore {track.title} <span aria-hidden="true">→</span>
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div>
          <p className="text-sm font-semibold text-blue-700">
            Everything in one place
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Available resource types
          </h2>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {resourceTypes.map((resource) => (
            <article
              key={resource.title}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                  {resource.icon}
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    {resource.title}
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {resource.description}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-slate-900 px-6 py-8 text-white sm:px-10">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-blue-300">
              Learn your way
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Different resources. Different teachers. One learning platform.
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              VirtualKaksha will let students compare explanations, videos and
              learning material from different teachers instead of restricting
              them to one educator.
            </p>
          </div>

          <p className="max-w-sm text-sm font-medium leading-6 text-slate-300 lg:text-right">
            Teacher names are searchable alongside titles, chapters, and subjects in resource search.
          </p>
        </div>
      </section>
    </div>
  );
}
