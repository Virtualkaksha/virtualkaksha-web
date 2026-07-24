export default function Features() {
  const features = [
    {
      title: "📚 NCERT Solutions",
      description: "Complete chapter-wise NCERT solutions for Classes 1 to 12.",
    },
    {
      title: "🎥 Video Lectures",
      description: "High-quality video lectures by experienced teachers.",
    },
    {
      title: "📝 Mock Tests",
      description: "Practice with board-level mock tests and instant results.",
    },
    {
      title: "❓ Important Questions",
      description: "Most expected questions for school and competitive exams.",
    },
    {
      title: "📖 Notes",
      description: "Easy-to-understand handwritten and digital notes.",
    },
    {
      title: "🤖 AI Learning",
      description: "AI-powered doubt solving and personalized learning.",
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-blue-700">
            Why Choose VirtualKaksha?
          </h2>

          <p className="mt-4 text-gray-600 text-lg">
            Everything a student needs to succeed, all in one platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border p-8 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <h3 className="text-2xl font-semibold mb-4">
                {feature.title}
              </h3>

              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}