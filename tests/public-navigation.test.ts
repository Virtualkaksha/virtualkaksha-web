import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function files(root: string): Promise<string[]> { return (await readdir(root, { withFileTypes: true })).flatMap((entry) => entry.isDirectory() ? [] : [path.join(root, entry.name)]).concat(...await Promise.all((await readdir(root, { withFileTypes: true })).filter((x) => x.isDirectory()).map((x) => files(path.join(root, x.name))))); }

test("tracked application UI contains no placeholder hrefs", async () => {
  const source = (await Promise.all((await files("app")).filter((file) => /\.tsx?$/.test(file)).map((file) => readFile(file, "utf8")))).join("\n");
  assert.doesNotMatch(source, /href\s*=\s*["']#/);
});

test("public navigation uses real routes and excludes retired destinations", async () => {
  const source = await Promise.all(["app/components/Navbar.tsx", "app/components/NavbarClient.tsx", "app/components/Footer.tsx", "app/components/Hero.tsx", "app/components/PopularResources.tsx", "app/components/TeacherSection.tsx", "app/components/student/StudentSidebar.tsx", "app/components/student/StudentTopbar.tsx"].map((file) => readFile(file, "utf8")));
  const joined = source.join("\n");
  for (const route of ["/", "/search", "/about", "/contact", "/privacy", "/terms", "/login", "/signup", "/teacher/login", "/teacher-access"]) assert.match(joined, new RegExp(route.replace("/", "\\/")));
  assert.match(joined, /Built for teachers|#teachers|Teacher login|Request teacher access/);
  assert.doesNotMatch(joined, /["']\/(?:courses|notes|tests|student\/settings)["']/);
});

test("student navigation exposes only implemented destinations", async () => {
  const sidebar = await readFile("app/components/student/StudentSidebar.tsx", "utf8");
  const topbar = await readFile("app/components/student/StudentTopbar.tsx", "utf8");
  const resources = await readFile("app/student/resources/page.tsx", "utf8");
  const studentLayout = await readFile("app/student/layout.tsx", "utf8");
  const routes = {
    "/student": "app/student/page.tsx",
    "/student/resources": "app/student/resources/page.tsx",
    "/student/bookmarks": "app/student/bookmarks/page.tsx",
    "/student/continue-learning": "app/student/continue-learning/page.tsx",
    "/student/teachers": "app/student/teachers/page.tsx",
    "/student/coaching-institutes": "app/student/coaching-institutes/page.tsx",
    "/student/profile": "app/student/profile/page.tsx",
    "/contact": "app/contact/page.tsx",
  } as const;

  for (const [route, file] of Object.entries(routes)) {
    assert.match(`${sidebar}\n${topbar}`, new RegExp(route.replaceAll("/", "\\/")));
    await assert.doesNotReject(access(file));
  }
  assert.match(sidebar, /label: "Help & Support"[\s\S]*href: "\/contact"/);
  assert.match(topbar, /studentSupportNavigationItem/);
  // Catalogue filters must stay query parameters on the working search page rather
  // than becoming separate routes with nothing behind them.
  assert.doesNotMatch(`${sidebar}\n${topbar}\n${resources}`, /\/student\/(?:settings|tests|courses|coachings|ncert-solutions|video-lectures|notifications)/);
  assert.match(studentLayout, /getCurrentIdentity\(\)/);
  assert.match(studentLayout, /Sign in/);
});

test("public content reflects Classes 6-12 and removes unverifiable claims", async () => {
  const source = (await Promise.all(["app/components/ChooseClass.tsx", "app/components/Courses.tsx", "app/components/TopEducators.tsx", "app/components/Testimonials.tsx", "app/about/page.tsx"].map((file) => readFile(file, "utf8")))).join("\n");
  for (let level = 6; level <= 12; level += 1) assert.match(source, new RegExp(`Class ${level}`));
  assert.doesNotMatch(source, /Class [1-5](?:\D|$)|trusted by thousands|years experience|\d+ Lessons|\d+ Hours|What Students Say/i);
});
