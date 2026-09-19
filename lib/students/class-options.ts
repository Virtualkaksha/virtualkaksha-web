import type { ResourceSearchQuery } from "@/lib/resources/resource-search-query";

export const STUDENT_BOARD_OPTIONS = [
  { slug: "cbse", name: "CBSE" },
  { slug: "icse", name: "ICSE" },
] as const;

export const STUDENT_CLASS_OPTIONS = [
  { slug: "class-5", name: "Class 5" },
  { slug: "class-6", name: "Class 6" },
  { slug: "class-7", name: "Class 7" },
  { slug: "class-8", name: "Class 8" },
  { slug: "class-9", name: "Class 9" },
  { slug: "class-10", name: "Class 10" },
  { slug: "class-11", name: "Class 11" },
  { slug: "class-12", name: "Class 12" },
] as const;

export type StudentBoardSlug = (typeof STUDENT_BOARD_OPTIONS)[number]["slug"];
export type StudentClassSlug = (typeof STUDENT_CLASS_OPTIONS)[number]["slug"];

export const STUDENT_BOARD_SLUGS = STUDENT_BOARD_OPTIONS.map((item) => item.slug) as [
  StudentBoardSlug,
  ...StudentBoardSlug[],
];

export const STUDENT_CLASS_SLUGS = STUDENT_CLASS_OPTIONS.map((item) => item.slug) as [
  StudentClassSlug,
  ...StudentClassSlug[],
];

export const DEFAULT_STUDENT_BOARD_SLUG: StudentBoardSlug = "cbse";

export function isStudentClassSlug(value: string): value is StudentClassSlug {
  return STUDENT_CLASS_SLUGS.includes(value as StudentClassSlug);
}

export function isStudentBoardSlug(value: string): value is StudentBoardSlug {
  return STUDENT_BOARD_SLUGS.includes(value as StudentBoardSlug);
}

export function studentBoardName(slug: string) {
  return STUDENT_BOARD_OPTIONS.find((item) => item.slug === slug)?.name ?? slug;
}

export function studentClassName(slug: string) {
  return STUDENT_CLASS_OPTIONS.find((item) => item.slug === slug)?.name ?? slug;
}

export function studentCatalogueHome(boardSlug: string, classSlug: string) {
  return `/student/resources/${boardSlug}/${classSlug}`;
}

export function applyClassScopeToSearchQuery(
  query: ResourceSearchQuery,
  scope: { boardSlug: string; classSlug: string } | null,
): ResourceSearchQuery {
  if (!scope) return query;
  return {
    ...query,
    track: scope.boardSlug,
    trackType: "BOARD",
    level: scope.classSlug,
  };
}
