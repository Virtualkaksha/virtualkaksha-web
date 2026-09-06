import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import "./helpers/server-only";

import { handleAdminAssetRequest } from "@/app/api/admin/resources/[resourceId]/asset/route";
import { handleStudentAssetRequest } from "@/app/api/student/resources/[resourceId]/asset/route";
import { handleTeacherAssetRequest } from "@/app/api/teacher/resources/[resourceId]/asset/route";
import { handleNativeTeacherResourceCreation } from "@/app/api/teacher/resources/route";
import { handleBookmarkMutation } from "@/app/api/student/resources/[resourceId]/bookmark/route";
import { handleProgressGet, handleProgressPost } from "@/app/api/student/resources/progress/route";
import type { CurrentIdentityResult } from "@/lib/auth/current-identity";

const stale: CurrentIdentityResult = {
  ok: false,
  code: "STALE_SESSION",
  message: "The session is no longer valid.",
};
const inactive: CurrentIdentityResult = {
  ok: false,
  code: "INACTIVE_ACCOUNT",
  message: "The account is not available.",
};
const unavailable: CurrentIdentityResult = {
  ok: false,
  code: "IDENTITY_UNAVAILABLE",
  message: "Authentication is temporarily unavailable.",
};
const forbidden: CurrentIdentityResult = {
  ok: false,
  code: "FORBIDDEN",
  message: "Access is denied.",
};

async function expectPrivateIdentityFailure(response: Response, status: number) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  const body = await response.text();
  assert.doesNotMatch(body, /user-|sessionVersion|ADMIN|TEACHER|STUDENT|database|token/i);
}

test("stale and unavailable identities stop all PDF routes before lookup or storage", async () => {
  for (const [handler, decision, status] of [
    [handleAdminAssetRequest, stale, 401],
    [handleTeacherAssetRequest, forbidden, 403],
    [handleStudentAssetRequest, unavailable, 503],
  ] as const) {
    let touched = false;
    const response = await handler("resource-1", {
      resolveIdentity: async () => decision,
      findResource: async () => {
        touched = true;
        return null;
      },
      readFile: async () => {
        touched = true;
        return Buffer.from("%PDF");
      },
    } as never);
    await expectPrivateIdentityFailure(response, status);
    assert.equal(touched, false);
  }
});

test("native upload rejects stale identity before IP, formData, storage or database work", async () => {
  let parsed = false;
  const response = await handleNativeTeacherResourceCreation(
    new Request("https://virtual.test/api/teacher/resources", { method: "POST" }),
    {
      resolveIdentity: async () => stale,
      resolveIp: () => {
        throw new Error("IP resolution must not run");
      },
      parseFormData: async () => {
        parsed = true;
        return new FormData();
      },
      createResource: async () => {
        throw new Error("Creation must not run");
      },
    },
  );
  await expectPrivateIdentityFailure(response, 401);
  assert.equal(parsed, false);
});

test("student bookmark and progress fail closed on stale, inactive and identity outage", async () => {
  let mutated = false;
  const bookmark = await handleBookmarkMutation(
    new Request("https://virtual.test/api/student/resources/r/bookmark", {
      method: "PUT",
      headers: { origin: "https://virtual.test" },
    }),
    "resource-1",
    true,
    {
      resolveIdentity: async () => stale,
      mutateBookmark: async () => {
        mutated = true;
        throw new Error("must not mutate");
      },
    },
  );
  await expectPrivateIdentityFailure(bookmark, 401);

  const progressPost = await handleProgressPost(
    new Request("https://virtual.test/api/student/resources/progress", {
      method: "POST",
      body: JSON.stringify({ resourceId: "resource-1", page: 1 }),
    }),
    {
      resolveIdentity: async () => inactive,
      saveProgress: async () => {
        mutated = true;
        throw new Error("must not mutate");
      },
    },
  );
  await expectPrivateIdentityFailure(progressPost, 401);

  const progressGet = await handleProgressGet(
    new Request("https://virtual.test/api/student/resources/progress?resourceId=resource-1"),
    {
      resolveIdentity: async () => unavailable,
      getProgress: async () => {
        mutated = true;
        throw new Error("must not read");
      },
    },
  );
  await expectPrivateIdentityFailure(progressGet, 503);
  assert.equal(mutated, false);
});

test("admin and teacher server actions fresh-authorize before rate limiting and mutation", async () => {
  const admin = await readFile("app/admin/resources/actions.ts", "utf8");
  const boards = await readFile("app/admin/boards/actions.ts", "utf8");
  const teacher = await readFile("app/teacher/resources/actions.ts", "utf8");
  for (const action of ["approveResource", "rejectResource", "archiveResource"]) {
    const body = admin.slice(admin.indexOf(`export async function ${action}`));
    assert.ok(body.indexOf('requireCurrentRole("ADMIN")') < body.indexOf("enforceAdminMutation"));
  }
  assert.match(boards, /requireCurrentRole\("ADMIN"\)[\s\S]*limitAdminBoardMutation/);
  assert.ok(boards.indexOf("limitAdminBoardMutation") < boards.indexOf("prisma.board.create"));
  assert.match(teacher, /requireAnyCurrentRole\(\["TEACHER", "ADMIN"\]\)/);
  assert.doesNotMatch(teacher, /import\("@\/lib\/auth\/session"\)/);
});

test("protected layouts use current identity and proxy remains UX-only", async () => {
  const [admin, teacher, student, proxy] = await Promise.all([
    readFile("app/admin/layout.tsx", "utf8"),
    readFile("app/teacher/layout.tsx", "utf8"),
    readFile("app/student/layout.tsx", "utf8"),
    readFile("proxy.ts", "utf8"),
  ]);
  assert.match(admin, /requireCurrentRole\("ADMIN"\)/);
  assert.match(teacher, /requireCurrentRole\("TEACHER"\)/);
  assert.match(student, /getCurrentIdentity\(\)/);
  assert.doesNotMatch(student, /requireCurrentRole\("STUDENT"\)/);
  assert.doesNotMatch(`${admin}\n${teacher}\n${student}`, /session\.user\.roles|token\.roles|requireAdmin|requireTeacher|requireStudent/);
  assert.match(proxy, /const authorizedProxyPromise = auth\([\s\S]*return applyReportOnlyCsp\(request\);[\s\S]*Promise<NextMiddleware>/);
  assert.match(proxy, /export async function proxy\(request: NextRequest, event: NextFetchEvent\) {[\s\S]*await authorizedProxyPromise;[\s\S]*return authorizedProxy\(request, event\);/);
  assert.equal((proxy.match(/export async function proxy\(/g) ?? []).length, 1);
  assert.doesNotMatch(proxy, /export default/);
  assert.match(proxy, /export const config = {[\s\S]*matcher:/);
  assert.doesNotMatch(proxy, /findCurrentIdentityById|requireCurrentRole|requireAnyCurrentRole/);
});
