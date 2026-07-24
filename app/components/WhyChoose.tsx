import SectionTitle from "./ui/SectionTitle";

const reasons = [
  {
    icon: "📚",
    title: "Complete Study Material",
    description:
      "Access notes, NCERT solutions, important questions and previous-year papers in one place.",
  },
  {
    icon: "🎥",
    title: "Easy Video Lectures",
    description:
      "Learn difficult topics through simple and student-friendly video explanations.",
  },
  {
    icon: "📝",
    title: "Mock Tests and Practice",
    description:
      "Practice chapter-wise questions and full-syllabus mock tests to improve your performance.",
  },
];

export default function WhyChoose() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6">
        <SectionTitle
          title="Why Choose VirtualKaksha?"
          subtitle="Everything a student needs to learn, practise and improve—all in one place."
        />

        <div className="grid gap-8 md:grid-cols-3">
          {reasons.map((reason) => (
            <div
              key={reason.title}
              className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="text-5xl">{reason.icon}</div>

              <h3 className="mt-5 text-xl font-bold text-blue-700">
                {reason.title}
              </h3>

              <p className="mt-3 leading-7 text-gray-600">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}