import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  expectedFormatForResourceType,
  getResourceTypeContentProfile,
  isFormatAllowedForResourceType,
} from "@/lib/resources/resource-type-content";

const DOCUMENT_TYPE_CODES = [
  "NOTES",
  "NCERT_SOLUTIONS",
  "NCERT_EXEMPLAR",
  "IMPORTANT_QUESTIONS",
  "PREVIOUS_YEAR_QUESTIONS",
  "WORKSHEETS",
  "FORMULA_SHEETS",
  "MIND_MAPS",
  "CHAPTER_TESTS",
  "SAMPLE_PAPERS",
];

test("video lectures are linked videos and every other seeded type is a document", () => {
  const video = getResourceTypeContentProfile("VIDEO_LECTURES");
  assert.equal(video.kind, "video");
  assert.equal(video.format, "VIDEO");
  assert.equal(video.supportsUpload, false, "videos are linked, never uploaded");

  for (const code of DOCUMENT_TYPE_CODES) {
    const profile = getResourceTypeContentProfile(code);
    assert.equal(profile.format, "PDF", `${code} must be a PDF`);
    assert.equal(profile.kind, "document");
    assert.equal(profile.supportsUpload, true);
  }
});

test("an unknown or missing type falls back to a document rather than guessing", () => {
  for (const code of [undefined, null, "", "SOMETHING_NEW"]) {
    assert.equal(expectedFormatForResourceType(code), "PDF");
  }
});

test("format is accepted only when it matches the type", () => {
  assert.equal(isFormatAllowedForResourceType("VIDEO_LECTURES", "VIDEO"), true);
  assert.equal(isFormatAllowedForResourceType("VIDEO_LECTURES", "PDF"), false);
  assert.equal(isFormatAllowedForResourceType("NCERT_SOLUTIONS", "PDF"), true);
  assert.equal(isFormatAllowedForResourceType("NCERT_SOLUTIONS", "VIDEO"), false);
  for (const format of ["ARTICLE", "IMAGE", "DOCUMENT", "EXTERNAL_LINK", "INTERACTIVE"]) {
    assert.equal(isFormatAllowedForResourceType("NOTES", format), false);
  }
});

test("the create form derives format from the type instead of offering a free choice", async () => {
  const form = await readFile("app/teacher/resources/ResourceCreateForm.tsx", "utf8");
  assert.match(form, /getResourceTypeContentProfile/);
  assert.match(form, /name="format"[\s\S]{0,40}type="hidden"|type="hidden" name="format"/);
  assert.doesNotMatch(form, /<option value="INTERACTIVE">/, "format must not be independently selectable");
  assert.doesNotMatch(form, /<option value="EXTERNAL_LINK">/);
  // Students only ever see free resources, so the form has to say so.
  assert.match(form, /Only Free resources appear in the student catalogue/);
});

test("the server rejects a type and format mismatch regardless of what the browser sends", async () => {
  const actions = await readFile("app/teacher/resources/actions.ts", "utf8");
  assert.match(actions, /isFormatAllowedForResourceType\(resourceType\.code, format\)/);
  const validationAt = actions.indexOf("isFormatAllowedForResourceType");
  const createAt = actions.indexOf("resource.create(");
  assert.ok(validationAt > 0 && validationAt < createAt, "validation must run before creation");
});
