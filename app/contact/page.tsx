import type { Metadata } from "next";
import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import { PUBLIC_SITE_CONFIG } from "@/lib/public-site-config";

export const metadata: Metadata = { title: "Contact and Support", alternates: { canonical: "/contact" } };
export default function ContactPage() {
  const { supportEmail, operatingLocation } = PUBLIC_SITE_CONFIG;
  const topics = ["General support", "Privacy requests", "Copyright and takedown notices", "Security reports"];
  return <><Navbar /><main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16"><h1 className="text-4xl font-bold text-slate-950">Contact VirtualKaksha</h1><p className="mt-4 max-w-2xl leading-7 text-slate-600">VirtualKaksha currently operates from {operatingLocation}. We do not publish a phone number or postal address.</p><div className="mt-10 grid gap-5 sm:grid-cols-2">{topics.map((topic) => <section key={topic} className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold text-slate-900">{topic}</h2><a href={`mailto:${supportEmail}`} className="mt-3 inline-block font-semibold text-blue-700">{supportEmail}</a></section>)}</div></main><Footer /></>;
}
