/**
 * Canonical ResourceType.slug values from prisma/seed.ts.
 * Marketing and nav links must use these, not lookalike slugs.
 */
export const CATALOGUE_TYPE_SLUGS = {
  notes: "notes",
  ncertSolutions: "ncert-solutions",
  videoLectures: "video-lectures",
  importantQuestions: "important-questions",
  previousYearQuestions: "previous-year-questions",
  chapterTests: "chapter-tests",
  samplePapers: "sample-papers",
} as const;

export const PUBLIC_CATALOGUE_PATH = "/search";
export const STUDENT_CATALOGUE_SEARCH_PATH = "/student/resources/search";

export function publicCatalogueTypeHref(type: string) {
  return `${PUBLIC_CATALOGUE_PATH}?type=${type}`;
}

export function studentCatalogueTypeHref(type: string) {
  return `${STUDENT_CATALOGUE_SEARCH_PATH}?type=${type}`;
}

export function getCatalogueFilterPresentation(
  typeSlug: string,
  resourceTypes: ReadonlyArray<{ slug: string; name: string }>,
) {
  const selected = resourceTypes.find((item) => item.slug === typeSlug) ?? null;
  const isPreviousYearPapers = typeSlug === CATALOGUE_TYPE_SLUGS.previousYearQuestions;

  if (isPreviousYearPapers) {
    return {
      heading: "Previous Year Papers",
      description:
        "Browse board and entrance previous year papers by class, subject and chapter.",
      emptyTitle: "No previous year papers found",
      emptyDescription: "Try another class or subject, or remove a filter.",
    };
  }

  if (!selected) {
    return {
      heading: "Search learning resources",
      description: null as string | null,
      emptyTitle: "No resources found",
      emptyDescription: "Try a broader search or remove a filter.",
    };
  }

  return {
    heading: selected.name,
    description: `Browse published ${selected.name.toLowerCase()} by class, subject and chapter.`,
    emptyTitle: `No ${selected.name.toLowerCase()} found`,
    emptyDescription: "Try a broader search or remove a filter.",
  };
}
