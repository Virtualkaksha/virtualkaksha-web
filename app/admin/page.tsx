import Link from "next/link";

const adminSections = [
  {
    title: "Manage Resources",
    description:
      "Create, publish, update and organise notes, videos, PDFs, questions and learning material.",
    href: "/admin/resources",
    icon: "📚",
  },
  {
    title: "Board Structure",
    description:
      "Manage boards, class levels, subjects, chapters and academic mappings.",
    href: "/admin/boards",
    icon: "🏫",
  },
];

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl bg-blue-700 px-6 py-8 text-white shadow-sm sm:px-10 sm:py-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
            VirtualKaksha Admin
          </p>

          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            Content Management Dashboard
          </h1>

          <p className="mt-4 max-w-3xl leading-7 text-blue-100">
            Manage the academic structure and published learning resources
            displayed inside the VirtualKaksha student learning panel.
          </p>
        </section>

        <section className="mt-8">
          <p className="text-sm font-semibold text-blue-700">
            Administration
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Choose a management area
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {adminSections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                  {section.icon}
                </div>

                <h3 className="mt-5 text-xl font-bold text-slate-900">
                  {section.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {section.description}
                </p>

                <p className="mt-5 text-sm font-semibold text-blue-700">
                  Open section →
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}