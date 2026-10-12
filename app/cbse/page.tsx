import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import { JsonLd } from "@/components/public/JsonLd";
import { listPublicCatalogueEntries, publicCataloguePath, publicPageSeo } from "@/lib/seo/public-listing";

const seo = publicPageSeo({});

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: { canonical: seo.canonical },
};

export default function CbseCatalogueIndexPage() {
  const classes = [...new Set(listPublicCatalogueEntries().map((entry) => entry.classSlug))].sort(
    (left, right) => Number(left.replace("class-", "")) - Number(right.replace("class-", "")),
  );

  return (
    <>
      <JsonLd data={seo.jsonLd} />
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12">
        <header>
          <h1 className="text-4xl font-bold text-slate-950">{seo.title}</h1>
          <p className="mt-3 max-w-3xl text-slate-600">{seo.description}</p>
        </header>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((level) => (
            <Link
              key={level}
              href={publicCataloguePath({ level })}
              className="rounded-3xl border border-slate-200 bg-white p-6 font-semibold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
            >
              {level.replace("class-", "Class ")}
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
