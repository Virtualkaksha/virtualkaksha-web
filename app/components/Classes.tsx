export default function Classes() {
  const classes = Array.from({ length: 12 }, (_, index) => index + 1);

  return (
    <section className="bg-blue-50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <p className="font-semibold text-blue-600">START LEARNING</p>

          <h2 className="mt-2 text-4xl font-bold text-gray-900 md:text-5xl">
            Choose Your Class
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Access notes, NCERT solutions, important questions and video
            lectures for Classes 1 to 12.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {classes.map((classNumber) => (
            <button
              key={classNumber}
              className="rounded-2xl border border-blue-100 bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg"
            >
              <span className="text-sm font-medium text-gray-500">Class</span>

              <span className="mt-1 block text-3xl font-bold text-blue-700">
                {classNumber}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}