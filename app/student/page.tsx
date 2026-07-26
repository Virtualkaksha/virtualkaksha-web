import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Flame,
  LibraryBig,
  Play,
  Sparkles,
  Target,
} from "lucide-react";

import EmptyState from "@/app/components/student/dashboard/EmptyState";
import ResourceCard from "@/app/components/student/dashboard/ResourceCard";
import StatCard from "@/app/components/student/dashboard/StatCard";
import {
  getStudentDashboard,
  StudentDashboardNotFoundError,
  type DashboardResource,
  type StudentDashboardData,
} from "@/lib/dashboard/student-dashboard";
import prisma from "@/lib/prisma";
import { requireStudent } from "@/lib/auth/session";

type PublicDashboardResource = {
  id: string;
  title: string;
  slug: string;
  format: string;
  durationSeconds: number | null;
  pageCount: number | null;
  resourceType: {
    name: string;
  };
  chapter: {
    slug: string;
    name: string;
    boardClassSubject: {
      board: {
        slug: string;
        shortName: string;
      };
      classLevel: {
        slug: string;
        name: string;
      };
      subject: {
        slug: string;
        name: string;
      };
    };
  } | null;
};

type PublicDashboardData = {
  publishedCount: number;
  freeCount: number;
  featuredResources: PublicDashboardResource[];
};

type DashboardPageState =
  | {
      mode: "personalized";
      data: StudentDashboardData;
    }
  | {
      mode: "setup";
      reason: "student-profile-not-found";
      publicData: PublicDashboardData;
    };

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getResourceMeta(resource: {
  format: string;
  durationSeconds: number | null;
  pageCount: number | null;
}) {
  if (resource.format === "VIDEO" && resource.durationSeconds) {
    return `${Math.max(1, Math.round(resource.durationSeconds / 60))} min video`;
  }

  if (resource.pageCount) {
    return `${resource.pageCount} ${resource.pageCount === 1 ? "page" : "pages"}`;
  }

  return resource.format.replaceAll("_", " ").toLowerCase();
}

function getPublicResourceHref(resource: PublicDashboardResource) {
  if (!resource.chapter) return "/student/resources";

  const { board, classLevel, subject } = resource.chapter.boardClassSubject;

  return `/student/resources/${board.slug}/${classLevel.slug}/${subject.slug}/${resource.chapter.slug}/${resource.slug}`;
}

async function getPublicDashboardData(): Promise<PublicDashboardData> {
  const [publishedCount, freeCount, featuredResources] = await Promise.all([
    prisma.resource.count({
      where: {
        status: "PUBLISHED",
      },
    }),
    prisma.resource.count({
      where: {
        status: "PUBLISHED",
        access: "FREE",
      },
    }),
    prisma.resource.findMany({
      where: {
        status: "PUBLISHED",
        chapterId: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        format: true,
        durationSeconds: true,
        pageCount: true,
        resourceType: {
          select: {
            name: true,
          },
        },
        chapter: {
          select: {
            slug: true,
            name: true,
            boardClassSubject: {
              select: {
                board: {
                  select: {
                    slug: true,
                    shortName: true,
                  },
                },
                classLevel: {
                  select: {
                    slug: true,
                    name: true,
                  },
                },
                subject: {
                  select: {
                    slug: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        {
          isFeatured: "desc",
        },
        {
          publishedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 6,
    }),
  ]);

  return {
    publishedCount,
    freeCount,
    featuredResources,
  };
}

async function getDashboardPageState(): Promise<DashboardPageState> {
  const user = await requireStudent();

  try {
    return {
      mode: "personalized",
      data: await getStudentDashboard(user.id),
    };
  } catch (error) {
    if (error instanceof StudentDashboardNotFoundError) {
      return {
        mode: "setup",
        reason: "student-profile-not-found",
        publicData: await getPublicDashboardData(),
      };
    }

    throw error;
  }
}

function DashboardResourceGrid({
  resources,
  emptyTitle,
  emptyDescription,
}: {
  resources: DashboardResource[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (resources.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel="Browse resources"
        actionHref="/student/resources"
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          title={resource.title}
          eyebrow={
            resource.subjectName ?? resource.resourceType.name
          }
          meta={getResourceMeta(resource)}
          href={resource.href ?? "/student/resources"}
          format={resource.format}
        />
      ))}
    </div>
  );
}

function PersonalizedDashboard({ data }: { data: StudentDashboardData }) {
  const continueLearning = data.continueLearning;
  const firstName = data.student.firstName;
  const academicTrack = [
    data.student.board?.shortName,
    data.student.classLevel?.name,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-[1480px] space-y-7 pb-8">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 px-6 py-8 text-white shadow-[0_24px_70px_rgba(15,23,42,0.20)] sm:px-8 lg:px-10 lg:py-10">
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-1/3 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1.35fr_0.65fr] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur">
              <Sparkles className="h-4 w-4 text-blue-300" aria-hidden="true" />
              {academicTrack || "Your learning workspace"}
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {getGreeting()}, {firstName}.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {data.student.learningGoal
                ? data.student.learningGoal
                : "Stay consistent, continue your lessons and keep building momentum toward your academic goals."}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={continueLearning?.href ?? "/student/resources"}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                {continueLearning ? "Resume learning" : "Start learning"}
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
                  This week
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {data.stats.completedThisWeek}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Target className="h-6 w-6" aria-hidden="true" />
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-300">
              {data.stats.completedThisWeek === 1
                ? "1 resource completed during the last seven days."
                : `${data.stats.completedThisWeek} resources completed during the last seven days.`}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Completed"
          value={data.stats.completedResources.toLocaleString("en-US")}
          detail="Resources completed across your learning journey"
          icon={CheckCircle2}
        />
        <StatCard
          label="In progress"
          value={data.stats.inProgressResources.toLocaleString("en-US")}
          detail="Resources currently waiting for you to continue"
          icon={Flame}
        />
        <StatCard
          label="Bookmarks"
          value={data.stats.bookmarkedResources.toLocaleString("en-US")}
          detail="Saved resources available for quick revision"
          icon={Bookmark}
        />
        <StatCard
          label="Completed this week"
          value={data.stats.completedThisWeek.toLocaleString("en-US")}
          detail="Your verified activity from the last seven days"
          icon={BookOpenCheck}
        />
      </section>

      <section className="grid gap-7 xl:grid-cols-[1.55fr_0.75fr]">
        <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Continue learning
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Pick up exactly where you stopped
          </h2>

          {continueLearning ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <div className="grid md:grid-cols-[0.78fr_1.22fr]">
                <div className="flex min-h-56 items-center justify-center bg-slate-900 p-8 text-white">
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                      <Play className="h-7 w-7 fill-current" aria-hidden="true" />
                    </div>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                      {continueLearning.resourceType.name}
                    </p>
                  </div>
                </div>

                <div className="p-6 sm:p-7">
                  <p className="text-xs font-semibold text-slate-500">
                    {[continueLearning.subjectName, continueLearning.chapterName]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <h3 className="mt-3 text-xl font-bold leading-8 text-slate-950">
                    {continueLearning.title}
                  </h3>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>Lesson progress</span>
                      <span>{continueLearning.progressPercent}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-blue-700"
                        style={{
                          width: `${Math.min(100, Math.max(0, continueLearning.progressPercent))}%`,
                        }}
                      />
                    </div>
                  </div>

                  <Link
                    href={continueLearning.href ?? "/student/resources"}
                    className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800"
                  >
                    Resume resource
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="Your learning journey starts here"
                description="Open any published resource to begin tracking progress and unlock your personalised learning history."
                actionLabel="Explore resources"
                actionHref="/student/resources"
              />
            </div>
          )}
        </div>

        <aside className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Student profile
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">
            Your academic track
          </h2>

          <dl className="mt-6 space-y-5">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Student
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {data.student.displayName}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Board
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {data.student.board?.name ?? "Not selected"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Class
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {data.student.classLevel?.name ?? "Not selected"}
              </dd>
            </div>
          </dl>

          <Link
            href="/student/resources"
            className="mt-7 inline-flex w-full min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
          >
            Explore your syllabus
          </Link>
        </aside>
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Recently viewed
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Return to your recent lessons
          </h2>
        </div>

        <DashboardResourceGrid
          resources={data.recentlyViewed}
          emptyTitle="No recent activity yet"
          emptyDescription="Resources you open will appear here automatically, ordered by your latest activity."
        />
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Recommended for you
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Continue with your board and class
          </h2>
        </div>

        <DashboardResourceGrid
          resources={data.recommendations}
          emptyTitle="Recommendations are being prepared"
          emptyDescription="Publish resources matching this student’s board and class to activate personalised recommendations."
        />
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Saved for revision
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Bookmarked resources
          </h2>
        </div>

        <DashboardResourceGrid
          resources={data.bookmarks}
          emptyTitle="No bookmarks yet"
          emptyDescription="Bookmark useful lessons and they will stay available here for quick revision."
        />
      </section>
    </div>
  );
}

function SetupDashboard({
  publicData,
}: {
  publicData: PublicDashboardData;
}) {
  return (
    <div className="mx-auto max-w-[1480px] space-y-7 pb-8">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 px-6 py-8 text-white shadow-[0_24px_70px_rgba(15,23,42,0.20)] sm:px-8 lg:px-10 lg:py-10">
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="relative grid gap-8 xl:grid-cols-[1.35fr_0.65fr] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200">
              <Sparkles className="h-4 w-4 text-blue-300" aria-hidden="true" />
              VirtualKaksha learning workspace
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              A premium dashboard ready for real student data.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              The dashboard is connected to PostgreSQL and uses the authenticated
              student session for progress, bookmarks, recent activity and
              personalised recommendations.
            </p>
            <Link
              href="/student/resources"
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              Explore resources
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                  Published library
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {publicData.publishedCount}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <LibraryBig className="h-6 w-6" aria-hidden="true" />
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-300">
              {publicData.freeCount} published resources currently have free access.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">
          Student profile required
        </p>
        <h2 className="mt-2 text-xl font-bold text-amber-950">
          Your account does not have a StudentProfile
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-amber-900/80">
          Your account is authenticated, but its student profile is unavailable.
          Complete student onboarding or contact an administrator.
        </p>
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Live platform content
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Published resources from PostgreSQL
          </h2>
        </div>

        {publicData.featuredResources.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {publicData.featuredResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                title={resource.title}
                eyebrow={
                  resource.chapter?.boardClassSubject.subject.name ??
                  resource.resourceType.name
                }
                meta={getResourceMeta(resource)}
                href={getPublicResourceHref(resource)}
                format={resource.format}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No published resources yet"
            description="Publish your first resource from the admin panel and it will automatically appear here."
            actionLabel="Open resource library"
            actionHref="/student/resources"
          />
        )}
      </section>
    </div>
  );
}

export default async function StudentDashboardPage() {
  const state = await getDashboardPageState();

  if (state.mode === "personalized") {
    return <PersonalizedDashboard data={state.data} />;
  }

  return <SetupDashboard publicData={state.publicData} />;
}
