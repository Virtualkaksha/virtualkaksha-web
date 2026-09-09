import SectionTitle from "./ui/SectionTitle";
import Link from "next/link";

const classes = [
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
];

export default function ChooseClass() {
  return (
    <section id="choose-class" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">

        <SectionTitle
          title="Choose Your Class"
          subtitle="Select your class to access notes, NCERT solutions, previous year papers and video lectures."
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">

          {classes.map((item) => (
            <Link
              key={item}
              href={`/search?level=${item.toLowerCase().replace(" ", "-")}`}
              className="bg-white rounded-xl shadow-md hover:shadow-xl hover:bg-blue-600 hover:text-white transition-all duration-300 p-6 font-semibold text-lg"
            >
              {item}
            </Link>
          ))}

        </div>

      </div>
    </section>
  );
}
