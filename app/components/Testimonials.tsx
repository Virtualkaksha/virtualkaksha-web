export default function Testimonials() {
  return (
    <section className="py-20 bg-blue-50">
      <div className="max-w-6xl mx-auto px-6">

        <h2 className="text-4xl font-bold text-center text-blue-700">
          What Students Say
        </h2>

        <p className="text-center text-gray-600 mt-3">
          Trusted by thousands of learners across India.
        </p>

        <div className="grid md:grid-cols-3 gap-8 mt-14">

          <div className="bg-white shadow-lg rounded-xl p-6">
            <h3 className="font-bold text-lg">Aarav Sharma</h3>
            <p className="text-yellow-500 mt-2">★★★★★</p>
            <p className="text-gray-600 mt-4">
              VirtualKaksha helped me improve my Maths and Science scores with
              easy notes and mock tests.
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-6">
            <h3 className="font-bold text-lg">Priya Verma</h3>
            <p className="text-yellow-500 mt-2">★★★★★</p>
            <p className="text-gray-600 mt-4">
              The video lectures are amazing and very easy to understand.
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-6">
            <h3 className="font-bold text-lg">Rahul Singh</h3>
            <p className="text-yellow-500 mt-2">★★★★★</p>
            <p className="text-gray-600 mt-4">
              Best platform for NCERT Solutions and Important Questions.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}