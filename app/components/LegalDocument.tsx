import type { ReactNode } from "react";
import Link from "next/link";

import Footer from "./Footer";
import Navbar from "./Navbar";
import { PUBLIC_SITE_CONFIG } from "@/lib/public-site-config";

export default function LegalDocument({ title, effectiveDate, children }: { title: string; effectiveDate: string; children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-14 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">VirtualKaksha policies</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">{title}</h1>
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Effective date: {effectiveDate}. The final public-launch date is pending owner confirmation.
        </p>
        <div className="mt-10 space-y-9 text-base leading-8 text-slate-700">{children}</div>
        <p className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-600">
          Questions? <Link href={`mailto:${PUBLIC_SITE_CONFIG.supportEmail}`} className="font-semibold text-blue-700">Contact {PUBLIC_SITE_CONFIG.supportEmail}</Link>.
        </p>
      </main>
      <Footer />
    </>
  );
}
