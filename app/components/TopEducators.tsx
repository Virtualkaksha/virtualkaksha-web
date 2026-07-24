import SectionTitle from "./ui/SectionTitle";

const educators = [
  {
    name: "Ananya Sharma",
    subject: "Mathematics",
    experience: "8+ years experience",
    classes: "Classes 9–12",
    initials: "AS",
  },
  {
    name: "Rahul Verma",
    subject: "Science",
    experience: "10+ years experience",
    classes: "Classes 6–10",
    initials: "RV",
  },
  {
    name: "Priya Mehta",
    subject: "English",
    experience: "7+ years experience",
    classes: "Classes 6–12",
    initials: "PM",
  },
];

export default function TopEducators() {
  return (
    <section className="bg-slate-50 px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          title="Learn from Expert Educators"
          subtitle="Understand difficult concepts with guidance from experienced and passionate teachers."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {educators.map((educator) => (
            <article
              key={educator.name}
              className="rounded-3xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-700">
                  {educator.initials}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {educator.name}
                  </h3>

                  <p className="mt-1 font-medium text-blue-600">
                    {educator.subject}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-600">
                <p>{educator.experience}</p>
                <p>{educator.classes}</p>
              </div>

              <button
                type="button"
                className="mt-6 font-semibold text-blue-600 transition hover:text-blue-800"
              >
                View Profile →
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}