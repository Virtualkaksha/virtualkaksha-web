import SectionTitle from "./ui/SectionTitle";

const courses = [
  {
    category: "Class 10",
    title: "Complete Mathematics Course",
    description:
      "Concept videos, chapter notes, important questions and mock tests.",
    lessons: "48 Lessons",
    duration: "36 Hours",
    level: "Board Preparation",
    icon: "📐",
  },
  {
    category: "Class 10",
    title: "Complete Science Course",
    description:
      "Physics, Chemistry and Biology explained with simple concepts.",
    lessons: "52 Lessons",
    duration: "40 Hours",
    level: "Board Preparation",
    icon: "🔬",
  },
  {
    category: "Class 12",
    title: "Physics Revision Course",
    description:
      "Important concepts, numericals, derivations and exam practice.",
    lessons: "38 Lessons",
    duration: "28 Hours",
    level: "Advanced",
    icon: "⚡",
  },
];

export default function Courses() {
  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <SectionTitle
          title="Featured Courses"
          subtitle="Structured learning programs designed to help students understand concepts and prepare confidently."
        />

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <article
              key={course.title}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-44 items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 text-7xl">
                {course.icon}
              </div>

              <div className="p-7">
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                  {course.category}
                </span>

                <h3 className="mt-4 text-2xl font-bold text-slate-900 transition group-hover:text-blue-600">
                  {course.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {course.description}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-slate-600">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="font-semibold text-slate-900">
                      {course.lessons}
                    </p>
                    <p>Course Content</p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="font-semibold text-slate-900">
                      {course.duration}
                    </p>
                    <p>Total Duration</p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    {course.level}
                  </span>

                  <button className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700">
                    View Course
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button className="rounded-xl border border-blue-600 px-6 py-3 font-semibold text-blue-600 transition hover:bg-blue-50">
            Explore All Courses
          </button>
        </div>
      </div>
    </section>
  );
}