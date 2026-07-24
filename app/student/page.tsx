import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Bookmark,
  CalendarDays,
  ChevronRight,
  Clock3,
  Flame,
  LibraryBig,
  LineChart,
  Play,
  Search,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

import EmptyState from "@/app/components/student/dashboard/EmptyState";
import ResourceCard from "@/app/components/student/dashboard/ResourceCard";
import StatCard from "@/app/components/student/dashboard/StatCard";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DashboardResource = {
  id: string;
  title: string;
  slug: string;
  format: string;
  durationSeconds: number | null;
  pageCount: number | null;
  resourceType: { name: string };
  chapter: {
    slug: string;
    name: string;
    boardClassSubject: {
      board: { slug: string; shortName: string };
      classLevel: { slug: string; name: string };
      subject: { slug: string; name: string };
    };
  } | null;
};

function getResourceHref(resource: DashboardResource) {
  if (!resource.chapter) {
    return "/student/resources";
  }

  const relation = resource.chapter.boardClassSubject;

  return `/student/resources/${relation.board.slug}/${relation.classLevel.slug}/${relation.subject.slug}/${resource.chapter.slug}/${resource.slug}`;
}

function getResourceMeta(resource: DashboardResource) {
  if (resource.durationSeconds) {
    const minutes = Math.max(1, Math.round(resource.durationSeconds / 60));
    return `${minutes} min`;
  }

  if (resource.pageCount) {
    return `${resource.pageCount} pages`;
  }

  return resource.format.replaceAll("_", " ").toLowerCase();
}

async function getDashboardData() {
  const [publishedCount, freeCount, featuredResources, recentResources] =
    await Promise.all([
      prisma.resource.count({ where: { status: "PUBLISHED" } }),
      prisma.resource.count({
        where: { status: "PUBLISHED", access: "FREE" },
      }),
      prisma.resource.findMany({
        where: {
          status: "PUBLISHED",
          isFeatured: true,
          chapterId: { not: null },
        },
        select: {
          id: true,
          title: true,
          slug: true,
          format: true,
          durationSeconds: true,
          pageCount: true,
          resourceType: { select: { name: true } },
          chapter: {
            select: {
              slug: true,
              name: true,
              boardClassSubject: {
                select: {
                  board: { select: { slug: true, shortName: true } },
                  classLevel: { select: { slug: true, name: true } },
                  subject: { select: { slug: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
        take: 3,
      }),
      prisma.resource.findMany({
        where: { status: "PUBLISHED", chapterId: { not: null } },
        select: {
          id: true,
          title: true,
          slug: true,
          format: true,
          durationSeconds: true,
          pageCount: true,
          resourceType: { select: { name: true } },
          chapter: {
            select: {
              slug: true,
              name: true,
              boardClassSubject: {
                select: {
                  board: { select: { slug: true, shortName: true } },
                  classLevel: { select: { slug: true, name: true } },
                  subject: { select: { slug: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 4,
      }),
    ]);

  return {
    publishedCount,
    freeCount,
    featuredResources: featuredResources as DashboardResource[],
    recentResources: recentResources as DashboardResource[],
  };
}

export default async function StudentDashboardPage() {
  const data = await getDashboardData();
  const primaryResource =
    data.featuredResources[0] ?? data.recentResources[0] ?? null;
  const recommendations =
    data.featuredResources.length > 0
      ? data.featuredResources
      : data.recentResources.slice(0, 3);

  return (
    <div className="mx-auto max-w-[1480px] space-y-7 pb-8">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 px-6 py-8 text-white shadow-[0_24px_70px_rgba(15,23,42,0.20)] sm:px-8 lg:px-10 lg:py-10">
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-1/3 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1.35fr_0.65fr] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur">
              <Sparkles className="h-4 w-4 text-blue-300" aria-hidden="true" />
              Your learning workspace
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Learn with clarity. Build momentum every day.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Discover structured lessons, trusted study material and focused
              revision resources—organised around your academic journey.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={primaryResource ? getResourceHref(primaryResource) : "/student/resources"}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                {primaryResource ? "Start featured lesson" : "Explore resources"}
              </Link>
              <Link
                href="/student/resources"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Browse library
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                  Platform library
                </p>
                <p className="mt-2 text-3xl font-bold">{data.publishedCount}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <LibraryBig className="h-6 w-6" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-3/4 rounded-full bg-blue-400" />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-300">
              {data.freeCount} published resources are available with free access.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Published resources"
          value={data.publishedCount.toLocaleString("en-US")}
          detail="Live learning material currently available"
          icon={BookOpenCheck}
        />
        <StatCard
          label="Free to access"
          value={data.freeCount.toLocaleString("en-US")}
          detail="Resources students can open without an upgrade"
          icon={Bookmark}
        />
        <StatCard
          label="Learning streak"
          value="—"
          detail="Personal streak activates after authentication"
          icon={Flame}
        />
        <StatCard
          label="Weekly progress"
          value="—"
          detail="Progress appears once a student profile is connected"
          icon={LineChart}
        />
      </section>

      <section className="grid gap-7 xl:grid-cols-[1.55fr_0.75fr]">
        <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                Continue learning
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                Pick up where your learning begins
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Featured content selected from the live VirtualKaksha library.
              </p>
            </div>
            <Link
              href="/student/resources"
              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              View all
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {primaryResource ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <div className="grid md:grid-cols-[0.8fr_1.2fr]">
                <div className="flex min-h-56 items-center justify-center bg-slate-900 p-8 text-white">
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                      <Play className="h-7 w-7 fill-current" aria-hidden="true" />
                    </div>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                      {primaryResource.resourceType.name}
                    </p>
                  </div>
                </div>
                <div className="p-6 sm:p-7">
                  <p className="text-xs font-semibold text-slate-500">
                    {primaryResource.chapter?.boardClassSubject.subject.name} · {primaryResource.chapter?.name}
                  </p>
                  <h3 className="mt-3 text-xl font-bold leading-8 text-slate-950">
                    {primaryResource.title}
                  </h3>
                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                      {primaryResource.chapter?.boardClassSubject.board.shortName}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                      {primaryResource.chapter?.boardClassSubject.classLevel.name}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {getResourceMeta(primaryResource)}
                    </span>
                  </div>
                  <Link
                    href={getResourceHref(primaryResource)}
                    className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800"
                  >
                    Open resource
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="No published lessons yet"
                description="Publish the first chapter resource from the admin panel and it will automatically appear here."
                actionLabel="Open resource library"
                actionHref="/student/resources"
              />
            </div>
          )}
        </div>

        <aside className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Quick actions
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">Move faster</h2>
          <div className="mt-5 space-y-2">
            {[
              { label: "Search study material", href: "/student/resources", icon: Search },
              { label: "Explore all subjects", href: "/student/resources", icon: LibraryBig },
              { label: "Review saved resources", href: "/student/saved", icon: Bookmark },
              { label: "Track your progress", href: "/student/progress", icon: Target },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-white">
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
              </Link>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-blue-50 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-950">AI Teacher</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Context-aware doubt solving will connect to your active lesson in a future sprint.
            </p>
            <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
              Coming soon
            </span>
          </div>
        </aside>
      </section>

      <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              Recommended for you
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              High-value resources to explore next
            </h2>
          </div>
          <Link href="/student/resources" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
            Browse full library
          </Link>
        </div>

        {recommendations.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recommendations.map((resource) => (
              <ResourceCard
                key={resource.id}
                title={resource.title}
                eyebrow={`${resource.chapter?.boardClassSubject.subject.name ?? "Learning"} · ${resource.resourceType.name}`}
                meta={getResourceMeta(resource)}
                href={getResourceHref(resource)}
                format={resource.format}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="Recommendations will appear here"
              description="Featured and recently published resources are surfaced automatically from PostgreSQL."
              actionLabel="Explore resource catalogue"
              actionHref="/student/resources"
            />
          </div>
        )}
      </section>

      <section className="grid gap-7 xl:grid-cols-2">
        <article className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Today</p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">Study plan</h2>
            </div>
            <CalendarDays className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </div>
          <div className="mt-6 space-y-3">
            {[
              ["Choose one focused chapter", "Start with a single clear outcome"],
              ["Complete one learning resource", "Read, watch or practise without multitasking"],
              ["Review your key takeaways", "Write a three-point revision summary"],
            ].map(([title, detail], index) => (
              <div key={title} className="flex gap-4 rounded-xl border border-slate-200 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-950">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Your growth</p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">Learning intelligence</h2>
            </div>
            <Trophy className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </div>
          <EmptyState
            title="Personal analytics are ready for authentication"
            description="After the login system identifies the active student, this panel will use StudentResourceProgress to show streaks, completion, weak areas and weekly learning time—without fabricated data."
            actionLabel="Explore resources meanwhile"
            actionHref="/student/resources"
          />
        </article>
      </section>
    </div>
  );
}
