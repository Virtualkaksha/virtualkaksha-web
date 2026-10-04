import assert from "node:assert/strict";
import test from "node:test";

import { formatStudentResourceTitle } from "@/lib/resources/display-title";

test("filename titles are shown as readable student titles", () => {
  assert.equal(
    formatStudentResourceTitle("Class_10_Science_Chapter_1_NCERT_Solutions.pdf"),
    "Class 10 Science Chapter 1 NCERT Solutions",
  );
  assert.equal(
    formatStudentResourceTitle("chemical-reactions-notes.PDF"),
    "chemical reactions notes",
  );
});

test("ordinary titles are left unchanged", () => {
  assert.equal(formatStudentResourceTitle("Chemical Reactions revision notes"), "Chemical Reactions revision notes");
  assert.equal(formatStudentResourceTitle("  NCERT Solutions  "), "NCERT Solutions");
});

test("resource viewer related resources use readable titles", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(
    "app/student/resources/[track]/[level]/[subject]/[chapter]/[resource]/page.tsx",
    "utf8",
  );
  assert.match(source, /formatStudentResourceTitle\(relatedResource\.title\)/);
  assert.match(source, /title=\{formatStudentResourceTitle\(selectedResource\.title\)\}/);
});
