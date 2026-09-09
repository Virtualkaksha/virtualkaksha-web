"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { logoutAction } from "@/app/(auth)/actions";
import { CATALOGUE_TYPE_SLUGS, publicCatalogueTypeHref } from "@/lib/resources/catalogue-types";

const links = [
  ["Home", "/"],
  ["Resources", "/search"],
  ["Previous Year Papers", publicCatalogueTypeHref(CATALOGUE_TYPE_SLUGS.previousYearQuestions)],
  ["Teachers", "/#teachers"],
  ["About", "/about"],
  ["Contact", "/contact"],
] as const;

type NavbarClientProps = {
  isAuthenticated: boolean;
  /** Role home resolved on the server; navigation hint only. */
  workspacePath: string;
};

export default function NavbarClient({ isAuthenticated, workspacePath }: NavbarClientProps) {
  const [open, setOpen] = useState(false);

  return (
    <nav
      aria-label="Primary navigation"
      className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="shrink-0 text-xl font-bold text-blue-700 sm:text-2xl">
          VirtualKaksha
        </Link>

        <div className="hidden items-center gap-5 font-medium lg:flex xl:gap-7">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="whitespace-nowrap text-slate-700 hover:text-blue-700">
              {label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 sm:flex lg:gap-3">
          {isAuthenticated ? (
            <>
              <Link
                href={workspacePath}
                className="rounded-lg px-3 py-2 font-semibold text-blue-700 hover:bg-blue-50"
              >
                Dashboard
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 font-semibold text-blue-700 hover:bg-blue-50">
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Create account
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg border border-slate-300 p-2 lg:hidden"
          aria-expanded={open}
          aria-controls="public-mobile-nav"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open ? (
        <div id="public-mobile-nav" className="border-t border-slate-200 bg-white px-6 py-4 lg:hidden">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              {label}
            </Link>
          ))}
          <div className="mt-3 flex gap-3 border-t border-slate-200 pt-4">
            {isAuthenticated ? (
              <>
                <Link
                  href={workspacePath}
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-blue-600 px-4 py-2 font-semibold text-blue-700"
                >
                  Dashboard
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-blue-600 px-4 py-2 font-semibold text-blue-700"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </nav>
  );
}
