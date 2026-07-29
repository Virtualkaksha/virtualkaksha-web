import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getAdminModerationActions,
  getAllowedAdminModerationStatuses,
  INVALID_ADMIN_MODERATION_TRANSITION,
  transitionAdminResource,
} from "@/lib/admin/resource-moderation-policy";

test("moderation controls match the current resource status", () => {
  assert.deepEqual(getAdminModerationActions("PENDING_REVIEW"), ["APPROVE", "REJECT", "ARCHIVE"]);
  assert.deepEqual(getAdminModerationActions("PUBLISHED"), ["ARCHIVE"]);
  assert.deepEqual(getAdminModerationActions("REJECTED"), ["ARCHIVE"]);
  assert.deepEqual(getAdminModerationActions("ARCHIVED"), []);
});

test("the moderation page gates every mutation control and renders archived resources read-only", async () => {
  const page = await readFile("app/admin/resources/[resourceId]/page.tsx", "utf8");
  assert.match(page, /actions\.includes\("APPROVE"\)/);
  assert.match(page, /actions\.includes\("REJECT"\)/);
  assert.match(page, /actions\.includes\("ARCHIVE"\)/);
  assert.match(page, /item\.status === "ARCHIVED"/);
  assert.match(page, /archived and read-only/);
});

test("approval and rejection accept only pending-review resources", () => {
  assert.deepEqual(getAllowedAdminModerationStatuses("APPROVE"), ["PENDING_REVIEW"]);
  assert.deepEqual(getAllowedAdminModerationStatuses("REJECT"), ["PENDING_REVIEW"]);
});

test("archive accepts only active moderated statuses", () => {
  assert.deepEqual(getAllowedAdminModerationStatuses("ARCHIVE"), [
    "PENDING_REVIEW",
    "PUBLISHED",
    "REJECTED",
  ]);
  assert.equal(getAllowedAdminModerationStatuses("ARCHIVE").includes("ARCHIVED"), false);
});

test("server actions use atomic status predicates and reject stale transitions", async () => {
  const actions = await readFile("app/admin/resources/actions.ts", "utf8");
  assert.match(actions, /prisma\.resource\.updateMany/);
  assert.doesNotMatch(actions, /prisma\.resource\.update\(/);
  assert.match(actions, /transitionAdminResource/);

  await assert.rejects(
    transitionAdminResource(
      { resourceId: "resource-1", adminId: "admin-1", action: "APPROVE" },
      async () => ({ count: 0 }),
    ),
    new RegExp(INVALID_ADMIN_MODERATION_TRANSITION),
  );
  assert.match(INVALID_ADMIN_MODERATION_TRANSITION, /no longer in a state/);
});

test("approval and rejection write required fields with atomic current-status predicates", async () => {
  const now = new Date("2026-07-30T00:00:00.000Z");
  const updates: Array<Record<string, unknown>> = [];
  const updateMany = async (update: Record<string, unknown>) => { updates.push(update); return { count: 1 }; };

  await transitionAdminResource(
    { resourceId: "pending-1", adminId: "admin-1", action: "APPROVE", now },
    updateMany,
  );
  await transitionAdminResource(
    { resourceId: "pending-2", adminId: "admin-1", action: "REJECT", reason: "Needs corrections", now },
    updateMany,
  );

  assert.deepEqual(updates[0], {
    where: { id: "pending-1", status: { in: ["PENDING_REVIEW"] } },
    data: { status: "PUBLISHED", publishedAt: now, moderationNote: null, reviewedAt: now, reviewedByUserId: "admin-1" },
  });
  assert.deepEqual(updates[1], {
    where: { id: "pending-2", status: { in: ["PENDING_REVIEW"] } },
    data: { status: "REJECTED", publishedAt: null, moderationNote: "Needs corrections", reviewedAt: now, reviewedByUserId: "admin-1" },
  });
});

test("repeated and crafted approval or rejection attempts fail atomically", async () => {
  for (const action of ["APPROVE", "REJECT"] as const) {
    for (const currentStatus of ["PUBLISHED", "REJECTED", "ARCHIVED"] as const) {
      await assert.rejects(
        transitionAdminResource(
          { resourceId: `${currentStatus}-resource`, adminId: "admin-1", action, reason: "Enough detail" },
          async (update) => ({ count: update.where.status.in.includes(currentStatus) ? 1 : 0 }),
        ),
        new RegExp(INVALID_ADMIN_MODERATION_TRANSITION),
      );
    }
  }
});

test("archive works from allowed statuses and fails for archived resources", async () => {
  for (const currentStatus of ["PENDING_REVIEW", "PUBLISHED", "REJECTED"] as const) {
    await transitionAdminResource(
      { resourceId: "resource-1", adminId: "admin-1", action: "ARCHIVE" },
      async (update) => ({ count: update.where.status.in.includes(currentStatus) ? 1 : 0 }),
    );
  }
  await assert.rejects(
    transitionAdminResource(
      { resourceId: "resource-1", adminId: "admin-1", action: "ARCHIVE" },
      async (update) => ({ count: update.where.status.in.includes("ARCHIVED") ? 1 : 0 }),
    ),
    new RegExp(INVALID_ADMIN_MODERATION_TRANSITION),
  );
});

test("successful moderation still revalidates before redirecting", async () => {
  const actions = await readFile("app/admin/resources/actions.ts", "utf8");
  assert.match(actions, /revalidatePath\(`\/admin\/resources\/\$\{resourceId\}`\)/);
  assert.match(actions, /revalidatePath\("\/student\/resources"\)/);
  assert.match(actions, /await refresh\(resourceId\); redirect\(`\/admin\/resources\/\$\{resourceId\}\?approved=true`\)/);
  assert.match(actions, /await refresh\(resourceId\); redirect\(`\/admin\/resources\/\$\{resourceId\}\?rejected=true`\)/);
  assert.match(actions, /await refresh\(resourceId\); redirect\("\/admin\/resources\?archived=true"\)/);
});
