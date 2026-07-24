export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className="text-2xl font-bold text-white">
            VirtualKaksha
          </h2>

          <p className="mt-4 text-sm leading-7">
            Empowering students with organised study material,
            mock tests, video lectures and quality learning
            resources—all in one place.
          </p>
        </div>

        <div>
          <h3 className="mb-5 text-lg font-semibold text-white">
            Resources
          </h3>

          <ul className="space-y-3 text-sm">
            <li>Notes</li>
            <li>NCERT Solutions</li>
            <li>Video Lectures</li>
            <li>Mock Tests</li>
            <li>Previous Year Papers</li>
          </ul>
        </div>

        <div>
          <h3 className="mb-5 text-lg font-semibold text-white">
            Company
          </h3>

          <ul className="space-y-3 text-sm">
            <li>About</li>
            <li>Teachers</li>
            <li>Contact</li>
            <li>Privacy Policy</li>
            <li>Terms & Conditions</li>
          </ul>
        </div>

        <div>
          <h3 className="mb-5 text-lg font-semibold text-white">
            Classes
          </h3>

          <ul className="space-y-3 text-sm">
            <li>Class 6</li>
            <li>Class 7</li>
            <li>Class 8</li>
            <li>Class 9</li>
            <li>Class 10</li>
            <li>Class 11</li>
            <li>Class 12</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 text-sm md:flex-row">
          <p>
            © {new Date().getFullYear()} VirtualKaksha. All rights reserved.
          </p>

          <p>
            Built with ❤️ using Next.js & Tailwind CSS
          </p>
        </div>
      </div>
    </footer>
  );
}