import assert from "node:assert/strict";
import test from "node:test";

import { parseResourceImportCsv, RESOURCE_IMPORT_HEADERS, RESOURCE_IMPORT_MAX_BYTES } from "@/lib/admin/resource-import-csv";

function csv(row: Partial<Record<typeof RESOURCE_IMPORT_HEADERS[number], string>> = {}, newline = "\r\n") {
  const values = { resource_id: "resource-1", expected_version: "1", title: "Algebra notes", resource_type_id: "type-1", language: "ENGLISH", access_level: "FREE", chapter_id: "chapter-1", reason: "Review metadata update", ...row };
  const cell = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return `${RESOURCE_IMPORT_HEADERS.map(cell).join(",")}${newline}${RESOURCE_IMPORT_HEADERS.map((header) => cell(values[header] ?? "")).join(",")}${newline}`;
}

test("strict parser accepts BOM, LF/CRLF, quoted commas, quotes and multiline values", () => {
  for (const newline of ["\n", "\r\n"]) {
    const input = `\uFEFF${csv({ description: 'Line one, "quoted"\nLine two' }, newline)}`;
    const rows = parseResourceImportCsv(new TextEncoder().encode(input));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].values.description, 'Line one, "quoted"\nLine two');
  }
});

test("headers may be reordered but missing, unknown and duplicate headers are rejected", () => {
  const valid = csv();
  const lines = valid.trim().split("\r\n");
  assert.equal(parseResourceImportCsv(new TextEncoder().encode(`${lines[0].split(",").reverse().join(",")}\r\n${lines[1].split(",").reverse().join(",")}`)).length, 1);
  for (const header of [
    lines[0].replace('"asset_state"', '"unknown"'),
    lines[0].replace('"asset_state"', '"resource_id"'),
    lines[0].split(",").slice(0, -1).join(","),
  ]) assert.throws(() => parseResourceImportCsv(new TextEncoder().encode(`${header}\r\n${lines[1]}`)));
});

test("invalid UTF-8, NUL, inner BOM and malformed quoting are rejected", () => {
  assert.throws(() => parseResourceImportCsv(Uint8Array.from([0xff, 0xfe])));
  for (const value of ["\0", "\uFEFF", "bad\u0001value", "bad\tvalue"]) assert.throws(() => parseResourceImportCsv(new TextEncoder().encode(csv({ description: value }))));
  assert.throws(() => parseResourceImportCsv(new TextEncoder().encode(csv().replace('"Algebra notes"', '"Algebra notes'))));
  assert.throws(() => parseResourceImportCsv(new TextEncoder().encode(csv().replace('"Algebra notes"', 'bad"quote'))));
});

test("duplicate IDs, partial rows and upload/row budgets are rejected", () => {
  const valid = csv();
  const [header, row] = valid.trim().split("\r\n");
  assert.throws(() => parseResourceImportCsv(new TextEncoder().encode(`${header}\r\n${row}\r\n${row}`)), /duplicate resource IDs/i);
  assert.throws(() => parseResourceImportCsv(new TextEncoder().encode(`${header}\r\n"partial"`)), /column count/i);
  assert.throws(() => parseResourceImportCsv(new Uint8Array(RESOURCE_IMPORT_MAX_BYTES + 1)), /2 MiB/i);
  assert.throws(() => parseResourceImportCsv(new TextEncoder().encode(`${header}\r\n${Array.from({ length: 251 }, (_, index) => row.replace('"resource-1"', `"resource-${index}"`)).join("\r\n")}`)), /250 resource rows/i);
  assert.throws(() => parseResourceImportCsv(new TextEncoder().encode(`${header}\r\n${Array.from({ length: 501 }, (_, index) => row.replace('"resource-1"', `"resource-${index}"`)).join("\r\n")}`)), /parser row limit/i);
  assert.throws(() => parseResourceImportCsv(new TextEncoder().encode(csv({ description: "x".repeat(4_001) }))), /field exceeds/i);
});
