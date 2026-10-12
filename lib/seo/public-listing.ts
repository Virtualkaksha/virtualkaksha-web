import { listPublicCatalogueEntries } from "../../prisma/chapter-catalogue";

export { listPublicCatalogueEntries };

export const PUBLIC_CATALOGUE_PREFIX = "/cbse";

export function classDisplayName(classSlug: string) {
  return classSlug.replace(/^class-/, "Class ");
}

export function subjectSearchName(subjectSlug: string) {
  if (subjectSlug === "mathematics") return "Maths";
  return subjectSlug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function publicCataloguePath(selection: { level: string; subject?: string; chapter?: string }) {
  const parts = [PUBLIC_CATALOGUE_PREFIX, selection.level];
  if (selection.subject) parts.push(selection.subject);
  if (selection.chapter && selection.subject) parts.push(selection.chapter);
  return parts.join("/");
}

export function publicSeoCopy(selection: {
  level?: string;
  subject?: string;
  chapterName?: string;
}) {
  const className = selection.level ? classDisplayName(selection.level) : null;
  const subjectName = selection.subject ? subjectSearchName(selection.subject) : null;
  if (className && subjectName && selection.chapterName) {
    return {
      title: `${className} ${subjectName} ${selection.chapterName} – CBSE notes`,
      description: `Free CBSE ${className} ${subjectName} notes, NCERT solutions and practice questions for ${selection.chapterName} on VirtualKaksha.`,
    };
  }
  if (className && subjectName) {
    return {
      title: `CBSE ${className} ${subjectName} notes and NCERT solutions`,
      description: `Browse CBSE ${className} ${subjectName} chapters with notes, NCERT solutions, videos and chapter tests.`,
    };
  }
  if (className) {
    return {
      title: `CBSE ${className} notes, NCERT solutions and tests`,
      description: `Choose a ${className} subject to open CBSE notes, NCERT solutions, previous year papers and practice tests.`,
    };
  }
  return {
    title: "CBSE Class 6–12 notes, NCERT solutions and tests",
    description: "Browse CBSE Classes 6 to 12 notes, NCERT solutions, videos and practice tests by class, subject and chapter.",
  };
}

export function listPublicCataloguePaths() {
  const paths = new Set<string>([PUBLIC_CATALOGUE_PREFIX]);
  for (const entry of listPublicCatalogueEntries()) {
    paths.add(publicCataloguePath({ level: entry.classSlug }));
    paths.add(publicCataloguePath({ level: entry.classSlug, subject: entry.subjectSlug }));
    for (const chapter of entry.chapters) {
      paths.add(publicCataloguePath({ level: entry.classSlug, subject: entry.subjectSlug, chapter: chapter.slug }));
    }
  }
  return [...paths];
}

export function findPublicCatalogueChapter(level: string, subject: string, chapter: string) {
  const numericLevel = Number(level.replace(/^class-/, ""));
  const entry = listPublicCatalogueEntries().find(
    (item) => item.classSlug === level && item.subjectSlug === subject,
  );
  if (!entry || !Number.isInteger(numericLevel)) return null;
  return entry.chapters.find((item) => item.slug === chapter) ?? null;
}

export function isPublicCatalogueClass(level: string) {
  return listPublicCatalogueEntries().some((entry) => entry.classSlug === level);
}

export function isPublicCatalogueSubject(level: string, subject: string) {
  return listPublicCatalogueEntries().some((entry) => entry.classSlug === level && entry.subjectSlug === subject);
}

export function publicPageSeo(query: {
  q?: string;
  type?: string;
  level?: string;
  subject?: string;
  chapter?: string;
}) {
  const chapter = query.level && query.subject && query.chapter
    ? findPublicCatalogueChapter(query.level, query.subject, query.chapter)
    : null;
  const copy = publicSeoCopy({
    level: query.level,
    subject: query.subject,
    chapterName: chapter?.name,
  });
  const canonical = !query.q && !query.type && query.level
    ? publicCataloguePath({ level: query.level, subject: query.subject, chapter: query.chapter })
    : query.q || query.type
      ? "/search"
      : PUBLIC_CATALOGUE_PREFIX;
  return {
    ...copy,
    canonical,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      name: copy.title,
      description: copy.description,
      url: `https://www.virtualkaksha.com${canonical}`,
      educationalLevel: query.level ? classDisplayName(query.level) : "Class 6–12",
      learningResourceType: "Study notes",
      inLanguage: "en",
      isAccessibleForFree: true,
      provider: {
        "@type": "EducationalOrganization",
        name: "VirtualKaksha",
        url: "https://www.virtualkaksha.com",
      },
    },
  };
}
