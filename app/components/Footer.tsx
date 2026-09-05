import Link from "next/link";

const resources = [
  ["Browse resources", "/search"],
  ["Notes", "/search?type=notes"],
  ["Practice tests", "/search?type=mock-test"],
  ["Previous papers", "/search?type=previous-year-paper"],
] as const;

const company = [
  ["About", "/about"],
  ["Contact", "/contact"],
  ["Privacy Policy", "/privacy"],
  ["Terms of Service", "/terms"],
] as const;

const accounts = [
  ["Student login", "/login"],
  ["Teacher login", "/teacher/login"],
  ["Request teacher access", "/teacher-access"],
  ["Admin login", "/admin/login"],
  ["Create account", "/signup"],
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <h2 className="text-2xl font-bold text-white">VirtualKaksha</h2>
          <p className="mt-4 max-w-sm text-sm leading-7">
            Browse structured learning resources for Classes 6–12, bookmark useful material, and
            continue reading PDFs.
          </p>
        </div>
        <FooterLinks title="Resources" links={resources} />
        <FooterLinks title="Company" links={company} />
        <FooterLinks title="Accounts" links={accounts} />
      </div>
      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} VirtualKaksha. All rights reserved.</p>
          <Link href="/#teachers" className="font-medium text-slate-400 hover:text-white">
            For teachers
          </Link>
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-white">{title}</h3>
      <ul className="space-y-3 text-sm">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
