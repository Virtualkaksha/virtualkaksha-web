const FILE_EXTENSION = /\.(pdf|docx?|pptx?|xlsx?)$/i;

export function formatStudentResourceTitle(title: string) {
  const trimmed = title.trim();
  if (!trimmed) return trimmed;

  const looksLikeFilename = FILE_EXTENSION.test(trimmed) || (/_/.test(trimmed) && !/\s/.test(trimmed));
  if (!looksLikeFilename) return trimmed;

  return trimmed
    .replace(FILE_EXTENSION, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
