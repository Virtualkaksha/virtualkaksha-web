import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const formPath = "app/teacher/resources/ResourceCreateForm.tsx";

test("PDF format defaults to native upload with a PDF-only file input", async () => {
  const source = await readFile(formPath, "utf8");

  assert.match(source, /useState<SourceType>\("native-pdf"\)/);
  assert.match(source, /<option value="native-pdf">Upload a PDF file<\/option>/);
  assert.match(source, /name="file" type="file" accept="application\/pdf,\.pdf" required/);
});

test("native PDF mode shows the picker and hides the external PDF URL", async () => {
  const source = await readFile(formPath, "utf8");

  // The document fields only render once a resource type has been chosen.
  assert.match(source, /selectedType && isPdfNativeUpload \? <div/);
  assert.match(source, /selectedType && isPdfExternalUrl \? <Field label="PDF URL">/);
  assert.doesNotMatch(source, /\["PDF",\s*"VIDEO"/);
});

test("switching format or source clears stale file and result state", async () => {
  const source = await readFile(formPath, "utf8");

  assert.match(source, /function clearSourceState\(\)/);
  assert.match(source, /setSelectedFile\(null\)/);
  assert.match(source, /setFileError\(null\)/);
  assert.match(source, /setResultMessage\(null\)/);
  assert.match(source, /function updateSourceType[\s\S]*?clearSourceState\(\)/);
});

test("custom form submission preserves the clicked moderation action", async () => {
  const source = await readFile(formPath, "utf8");

  assert.match(source, /submitter instanceof HTMLButtonElement/);
  assert.match(source, /formData\.set\(submitter\.name, submitter\.value\)/);
});

test("native PDF create stages the file before posting metadata", async () => {
  const source = await readFile(formPath, "utf8");

  assert.match(source, /stageNativePdfUpload\(formData, selectedFile\)/);
  assert.match(source, /fetch\("\/api\/teacher\/resources"/);
  assert.doesNotMatch(source, /formData\.set\("file", selectedFile\)/);
});

test("teacher upload action does not return storage paths or object keys", async () => {
  const source = await readFile("app/teacher/resources/actions.ts", "utf8");
  const uploadAction = source.slice(source.indexOf("export async function uploadTeacherResourcePdf"));

  assert.match(uploadAction, /assetId: result\.assetId/);
  assert.doesNotMatch(uploadAction, /objectKey: result\.objectKey/);
  assert.doesNotMatch(uploadAction, /readUrl: result\.readUrl/);
});
