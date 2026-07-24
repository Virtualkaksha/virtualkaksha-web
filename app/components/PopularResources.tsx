import SectionTitle from "./ui/SectionTitle";

const resources = [
  {
    icon: "📚",
    title: "Notes",
    description: "Chapter-wise notes for quick learning and revision.",
    href: "/notes",
  },
  {
    icon: "📝",
    title: "NCERT Solutions",
    description: "Clear and step-by-step solutions for NCERT questions.",
    href: "/ncert-solutions",
  },
  {
    icon: "🎥",
    title: "Video Lectures",
    description: "Easy-to-understand lectures for difficult concepts.",
    href: "/video-lectures",
  },
  {
    icon: "🧪",
    title: "Mock Tests",
    description: "Practice tests to improve speed, accuracy and confidence.",
    href: "/tests",
  },
  {
    icon: "📄",
    title: "Previous Year Papers",
    description: "Prepare better with board and competitive exam papers.",
    href: "/previous-year-papers",
  },
  {
    icon: "❓",
    title: "Important Questions",
    description: "Exam-focused questions selected chapter by chapter.",
    href: "/important-questions",
  },
];

export default function PopularResources() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6">
        <SectionTitle
          title="Popular Study Resources"
          subtitle="Everything you need to learn, practise and revise in one place."
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <a
              key={resource.title}
              href={resource.href}
              className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                  {resource.icon}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 transition group-hover:text-blue-600">
                    {resource.title}
                  </h3>

                  <p className="mt-2 leading-7 text-slate-600">
                    {resource.description}
                  </p>

                  <span className="mt-4 inline-block font-semibold text-blue-600">
                    Explore resource →
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}