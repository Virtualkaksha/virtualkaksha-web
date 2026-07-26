import Link from "next/link";
import type { ReactNode } from "react";
import { GraduationCap, ShieldCheck, Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <Link href="/" className="inline-flex items-center gap-3 font-bold">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
              <GraduationCap className="h-6 w-6" />
            </span>
            <span className="text-xl">VirtualKaksha</span>
          </Link>

          <div className="max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-200">
              <Sparkles className="h-3.5 w-3.5" />
              Your learning, organised
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight">
              One secure account for your complete learning journey.
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-300">
              Continue lessons, save resources and track progress from one focused student workspace.
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-300">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            Passwords are securely hashed and never stored as plain text.
          </div>
        </section>

        <section className="flex items-center bg-white p-6 sm:p-10 lg:p-14">
          <div className="w-full">{children}</div>
        </section>
      </div>
    </main>
  );
}
