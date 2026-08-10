/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/server-only";

import { deriveAcademicPaths } from "@/lib/admin/resource-metadata-plan";
import { createResourceImportApplyTransaction } from "@/repositories/admin-resource-import-apply.repository";
import type { ValidatedResourceImportRow } from "@/lib/admin/resource-import-validation";

const chapter = (id: string, slug: string) => ({ id, slug, boardClassSubject: { board: { slug: "cbse" }, classLevel: { slug: "class-10" }, subject: { slug: "mathematics" } } });
const examTopic = { id: "topic-1", slug: "mechanics", examSubject: { exam: { slug: "jee-main" }, subject: { slug: "physics" } } };
const resource = (id: string, title: string, mapping: "chapter" | "exam" = "chapter") => ({ id, title, titleHindi: null, description: null, resourceTypeId: "type-1", language: "ENGLISH", access: "FREE", chapterId: mapping === "chapter" ? "chapter-1" : null, examTopicId: mapping === "exam" ? "topic-1" : null, status: "DRAFT", version: 4, slug: `${id}-slug`, publishedAt: null });
const row = (id: string, title: string, overrides: Partial<ValidatedResourceImportRow> = {}): ValidatedResourceImportRow => ({ rowNumber: 2, resourceId: id, expectedVersion: 4, title, titleHindi: null, description: null, resourceTypeId: "type-1", language: "ENGLISH", access: "FREE", chapterId: "chapter-1", examTopicId: null, reason: "Correcting resource metadata", validationErrors: [], ...overrides });

function harness(initial: any[], options: { zeroFor?: string; auditFailureFor?: string } = {}) {
  const state = { resources: structuredClone(initial), audits: [] as any[] };
  const events: string[] = [];
  let transactionOptions: any;
  const prisma = {
    async $transaction(callback: (tx: any) => Promise<any>, configured: any) {
      transactionOptions = configured;
      const working = structuredClone(state);
      const tx = {
        resource: {
          findMany: async (args: any) => {
            events.push(args.orderBy ? "read:resources" : "read:collisions");
            if (!args.orderBy) return [];
            return working.resources.filter((item: any) => args.where.id.in.includes(item.id)).sort((a: any, b: any) => a.id.localeCompare(b.id));
          },
          updateMany: async (args: any) => {
            events.push(`update:${args.where.id}`);
            if (options.zeroFor === args.where.id) return { count: 0 };
            const item = working.resources.find((candidate: any) => candidate.id === args.where.id && candidate.version === args.where.version && candidate.status === args.where.status);
            if (!item) return { count: 0 };
            Object.assign(item, args.data, { version: item.version + args.data.version.increment });
            return { count: 1 };
          },
        },
        resourceType: { findMany: async () => (events.push("read:types"), [{ id: "type-1" }]) },
        chapter: { findMany: async () => (events.push("read:chapters"), [chapter("chapter-1", "polynomials"), chapter("chapter-2", "quadratics")]) },
        examTopic: { findMany: async () => (events.push("read:topics"), [examTopic]) },
        resourceMetadataAudit: { create: async ({ data }: any) => {
          events.push(`audit:${data.resourceId}`);
          if (options.auditFailureFor === data.resourceId) throw new Error("audit unavailable");
          working.audits.push(data);
        } },
      };
      try {
        const result = await callback(tx);
        state.resources = working.resources;
        state.audits = working.audits;
        return result;
      } catch (error) {
        throw error;
      }
    },
  };
  return { state, events, transact: createResourceImportApplyTransaction(prisma), get options() { return transactionOptions; } };
}

test("transaction plans every row before deterministic writes and uses bounded Serializable isolation", async () => {
  const fake = harness([resource("z-resource", "Old Z"), resource("a-resource", "Old A"), resource("n-resource", "Same")]);
  const result = await fake.transact([row("z-resource", "New Z"), row("n-resource", "Same", { rowNumber: 3 }), row("a-resource", "New A", { rowNumber: 4 })], "admin-1");
  assert.deepEqual(fake.options, { isolationLevel: "Serializable", maxWait: 5000, timeout: 15000 });
  assert.ok(fake.events.slice(0, 4).every((event) => event.startsWith("read:")), "all catalogue/resource reads precede writes");
  assert.deepEqual(fake.events.filter((event) => event.startsWith("update:")), ["update:a-resource", "update:z-resource"]);
  assert.deepEqual(fake.events.filter((event) => event.startsWith("audit:")), ["audit:a-resource", "audit:z-resource"]);
  assert.equal("error" in result, false);
  if (!("error" in result)) {
    assert.equal(result.noOpRows, 1);
    assert.equal(result.changedRows, 2);
  }
  assert.equal(fake.state.resources.find((item) => item.id === "n-resource").version, 4);
  assert.equal(fake.state.resources.find((item) => item.id === "a-resource").version, 5);
  assert.equal(fake.state.resources.find((item) => item.id === "z-resource").version, 5);
  assert.equal(fake.state.audits.length, 2);
});

test("exact version/status predicate failure rolls back the entire transaction", async () => {
  const fake = harness([resource("a-resource", "Old A"), resource("b-resource", "Old B")], { zeroFor: "b-resource" });
  const result = await fake.transact([row("a-resource", "New A"), row("b-resource", "New B")], "admin-1");
  assert.deepEqual(result, { error: "CONFLICT" });
  assert.deepEqual(fake.state.resources.map((item) => [item.title, item.version]), [["Old A", 4], ["Old B", 4]]);
  assert.equal(fake.state.audits.length, 0);
});

test("audit failure rolls back all resource updates and audit rows", async () => {
  const fake = harness([resource("a-resource", "Old A"), resource("b-resource", "Old B")], { auditFailureFor: "b-resource" });
  const result = await fake.transact([row("a-resource", "New A"), row("b-resource", "New B")], "admin-1");
  assert.deepEqual(result, { error: "BATCH_ROLLED_BACK" });
  assert.deepEqual(fake.state.resources.map((item) => [item.title, item.version]), [["Old A", 4], ["Old B", 4]]);
  assert.equal(fake.state.audits.length, 0);
});

test("committed rows expose exact previous and resulting chapter/exam paths", async () => {
  const chapterResource = resource("chapter-resource", "Old chapter");
  const examResource = resource("exam-resource", "Old exam", "exam");
  const fake = harness([chapterResource, examResource]);
  const result = await fake.transact([
    row("chapter-resource", "New chapter", { chapterId: "chapter-2" }),
    row("exam-resource", "New exam", { rowNumber: 3, chapterId: null, examTopicId: "topic-1" }),
  ], "admin-1");
  assert.equal("error" in result, false);
  if ("error" in result) return;
  const chapterResult = result.rows.find((item: any) => item.resourceId === "chapter-resource")!;
  assert.deepEqual(chapterResult.previousAcademicPaths, deriveAcademicPaths({ kind: "CHAPTER", board: "cbse", level: "class-10", subject: "mathematics", unit: "polynomials" }, "chapter-resource-slug"));
  assert.deepEqual(chapterResult.resultingAcademicPaths, deriveAcademicPaths({ kind: "CHAPTER", board: "cbse", level: "class-10", subject: "mathematics", unit: "quadratics" }, "chapter-resource-slug"));
  const examResult = result.rows.find((item: any) => item.resourceId === "exam-resource")!;
  assert.ok(examResult.previousAcademicPaths.includes("/student/resources/jee-main/exam/physics/mechanics/exam-resource-slug"));
  assert.deepEqual(examResult.previousAcademicPaths, examResult.resultingAcademicPaths);
});

test("academic paths contain only canonical existing route prefixes", () => {
  assert.deepEqual(deriveAcademicPaths({ kind: "CHAPTER", board: "cbse", level: "class-10", subject: "mathematics", unit: "polynomials" }, "notes"), ["/student/resources", "/student/resources/cbse", "/student/resources/cbse/class-10", "/student/resources/cbse/class-10/mathematics", "/student/resources/cbse/class-10/mathematics/polynomials", "/student/resources/cbse/class-10/mathematics/polynomials/notes"].sort());
  assert.deepEqual(deriveAcademicPaths({ kind: "EXAM", exam: "jee-main", subject: "physics", topic: "mechanics" }, "sheet"), ["/student/resources", "/student/resources/jee-main", "/student/resources/jee-main/exam", "/student/resources/jee-main/exam/physics", "/student/resources/jee-main/exam/physics/mechanics", "/student/resources/jee-main/exam/physics/mechanics/sheet"].sort());
});
