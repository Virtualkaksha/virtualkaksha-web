"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  ["Home", "/"], ["Resources", "/search"], ["About", "/about"], ["Contact", "/contact"],
] as const;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return <nav aria-label="Primary navigation" className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
      <Link href="/" className="text-2xl font-bold text-blue-700">VirtualKaksha</Link>
      <div className="hidden items-center gap-7 font-medium md:flex">{links.map(([label, href]) => <Link key={href} href={href} className="text-slate-700 hover:text-blue-700">{label}</Link>)}</div>
      <div className="hidden items-center gap-3 sm:flex"><Link href="/login" className="px-3 py-2 font-semibold text-blue-700">Login</Link><Link href="/signup" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">Create account</Link></div>
      <button type="button" className="rounded-lg border border-slate-300 p-2 md:hidden" aria-expanded={open} aria-controls="public-mobile-nav" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    </div>
    {open ? <div id="public-mobile-nav" className="border-t border-slate-200 bg-white px-6 py-4 md:hidden">{links.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 font-semibold text-slate-700 hover:bg-slate-50">{label}</Link>)}<div className="mt-3 flex gap-3 border-t border-slate-200 pt-4"><Link href="/login" className="rounded-lg border border-blue-600 px-4 py-2 font-semibold text-blue-700">Login</Link><Link href="/signup" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">Create account</Link></div></div> : null}
  </nav>;
}
