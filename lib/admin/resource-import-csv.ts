export const RESOURCE_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const RESOURCE_IMPORT_MAX_ROWS = 250;
export const RESOURCE_IMPORT_PARSER_ROW_CEILING = 500;
export const RESOURCE_IMPORT_MAX_CELLS = 21 * (RESOURCE_IMPORT_PARSER_ROW_CEILING + 1);

export const RESOURCE_IMPORT_HEADERS = [
  "resource_id", "expected_version", "title", "title_hindi", "description", "resource_type_id",
  "language", "access_level", "chapter_id", "exam_topic_id", "reason", "current_status", "board",
  "class", "subject", "chapter_or_topic", "resource_type", "current_updated_at", "current_slug",
  "asset_source", "asset_state",
] as const;

export type ResourceImportHeader = typeof RESOURCE_IMPORT_HEADERS[number];
export type ParsedResourceImportRow = { rowNumber: number; values: Record<ResourceImportHeader, string> };

export class ResourceImportCsvError extends Error {
  constructor(message: string) { super(message); this.name = "ResourceImportCsvError"; }
}

function fail(message: string): never { throw new ResourceImportCsvError(message); }

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') { field += '"'; index += 1; }
        else { quoted = false; closedQuote = true; }
      } else field += character;
      if (field.length > 4_000) fail("A CSV field exceeds its safe length limit.");
      continue;
    }
    if (closedQuote && character !== "," && character !== "\r" && character !== "\n") fail("The CSV contains malformed quoting.");
    if (character === '"') {
      if (field.length) fail("The CSV contains malformed quoting.");
      quoted = true;
      continue;
    }
    if (character === ",") { row.push(field); field = ""; closedQuote = false; }
    else if (character === "\r" || character === "\n") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); rows.push(row); row = []; field = ""; closedQuote = false;
      if (rows.length > RESOURCE_IMPORT_PARSER_ROW_CEILING + 1) fail("The CSV exceeds the parser row limit.");
    } else field += character;
    if (field.length > 4_000) fail("A CSV field exceeds its safe length limit.");
  }
  if (quoted) fail("The CSV contains an unterminated quoted field.");
  if (field || row.length) {
    row.push(field); rows.push(row);
    if (rows.length > RESOURCE_IMPORT_PARSER_ROW_CEILING + 1) fail("The CSV exceeds the parser row limit.");
  }
  return rows;
}

export function parseResourceImportCsv(bytes: Uint8Array): ParsedResourceImportRow[] {
  if (!bytes.length) fail("The CSV file is empty.");
  if (bytes.byteLength > RESOURCE_IMPORT_MAX_BYTES) fail("The CSV file exceeds 2 MiB.");
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { fail("The CSV must be valid UTF-8."); }
  if (text.startsWith("\uFEFF")) text = text.slice(1);
  if (text.includes("\uFEFF")) fail("The CSV contains an unexpected byte-order mark.");
  if (/\0|[\u0001-\u0009\u000B\u000C\u000E-\u001F\u007F]/u.test(text)) fail("The CSV contains unsupported control characters.");
  if (text.length > RESOURCE_IMPORT_MAX_BYTES) fail("The decoded CSV exceeds its safe character limit.");

  const parsed = parseCsv(text);
  while (parsed.length && parsed.at(-1)?.every((cell) => cell === "")) parsed.pop();
  if (!parsed.length) fail("The CSV header is missing.");
  if (parsed.reduce((count, row) => count + row.length, 0) > RESOURCE_IMPORT_MAX_CELLS) fail("The CSV exceeds the cell limit.");

  const normalizedHeaders = parsed[0].map((header) => header.normalize("NFKC").trim());
  if (normalizedHeaders.length !== RESOURCE_IMPORT_HEADERS.length) fail("The CSV must contain exactly 21 headers.");
  if (new Set(normalizedHeaders).size !== normalizedHeaders.length) fail("The CSV contains duplicate headers.");
  const expected = new Set<string>(RESOURCE_IMPORT_HEADERS);
  if (normalizedHeaders.some((header) => !expected.has(header))) fail("The CSV contains an unknown header.");
  if (RESOURCE_IMPORT_HEADERS.some((header) => !normalizedHeaders.includes(header))) fail("The CSV is missing a required header.");

  const dataRows = parsed.slice(1);
  if (dataRows.length > RESOURCE_IMPORT_MAX_ROWS) fail("The CSV exceeds 250 resource rows.");
  const seen = new Set<string>();
  return dataRows.map((cells, index) => {
    const rowNumber = index + 2;
    if (cells.length !== normalizedHeaders.length) fail(`Row ${rowNumber} does not match the header column count.`);
    if (cells.every((cell) => !cell.trim())) fail(`Row ${rowNumber} is blank within the resource data.`);
    const values = Object.fromEntries(normalizedHeaders.map((header, cell) => [header, cells[cell]])) as Record<ResourceImportHeader, string>;
    const resourceId = values.resource_id.normalize("NFKC").trim();
    if (seen.has(resourceId)) fail("The CSV contains duplicate resource IDs.");
    seen.add(resourceId);
    return { rowNumber, values };
  });
}
