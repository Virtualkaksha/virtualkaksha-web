import "server-only";

import {
  findBoardClassCatalogBySlug,
  findBoardClassSubjects,
  findPublishedResourceCatalog,
  findSubjectChapterCatalog,
  type BoardCatalogRecord,
  type ExamCatalogRecord,
  type ResourceTypeCatalogRecord,
} from "@/repositories/resource-catalog.repository";

export type LearningTrackViewModel = {
  id: string;
  title: string;
  shortName: string;
  slug: string;
  description: string;
  href: string;
  category: "School Board" | "Competitive Exam";
  icon: string;
  availableSubjects: number;
};

export type ResourceTypeViewModel = {
  id: string;
  name: string;
  nameHindi: string | null;
  code: string;
  slug: string;
  description: string;
  icon: string;
  publishedResources: number;
};

export type ResourceCatalogViewModel = {
  schoolBoards: LearningTrackViewModel[];
  competitiveExams: LearningTrackViewModel[];
  resourceTypes: ResourceTypeViewModel[];
  totals: {
    learningTracks: number;
    resourceTypes: number;
    publishedResources: number;
  };
};

export type BoardClassViewModel = {
  id: string;
  name: string;
  slug: string;
  numericLevel: number;
  subjectsCount: number;
  chaptersCount: number;
  href: string;
};

export type BoardClassCatalogViewModel = {
  board: {
    id: string;
    name: string;
    shortName: string;
    slug: string;
    description: string;
    category: string;
  };
  classes: BoardClassViewModel[];
  totals: {
    classes: number;
    subjects: number;
    chapters: number;
  };
};

export type ClassSubjectViewModel = {
  id: string;
  name: string;
  nameHindi: string | null;
  slug: string;
  description: string;
  icon: string;
  chaptersCount: number;
  publishedResourcesCount: number;
  href: string;
};

export type ClassSubjectCatalogViewModel = {
  board: {
    id: string;
    name: string;
    shortName: string;
    slug: string;
  };
  classLevel: {
    id: string;
    name: string;
    slug: string;
    numericLevel: number;
  };
  subjects: ClassSubjectViewModel[];
  totals: {
    subjects: number;
    chapters: number;
    publishedResources: number;
  };
};


export type ChapterResourceTypeViewModel = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  count: number;
};

export type SubjectChapterViewModel = {
  id: string;
  name: string;
  nameHindi: string | null;
  slug: string;
  chapterNumber: number | null;
  description: string;
  publishedResourcesCount: number;
  resourceTypes: ChapterResourceTypeViewModel[];
  href: string;
};

export type SubjectChapterCatalogViewModel = {
  board: { id: string; name: string; shortName: string; slug: string };
  classLevel: { id: string; name: string; slug: string; numericLevel: number };
  subject: {
    id: string;
    name: string;
    nameHindi: string | null;
    slug: string;
    description: string;
    icon: string;
  };
  chapters: SubjectChapterViewModel[];
  totals: { chapters: number; publishedResources: number };
};

function getBoardIcon(board: BoardCatalogRecord): string {
  if (board.slug === "cbse") return "📘";
  if (board.slug === "icse") return "📗";
  if (board.boardType === "STATE") return "🏫";
  return "📚";
}

function getExamIcon(exam: ExamCatalogRecord): string {
  switch (exam.examType) {
    case "JEE":
      return "⚙️";
    case "NEET":
      return "🧬";
    case "CUET":
      return "🎯";
    default:
      return "🏆";
  }
}

function getSubjectIcon(subjectSlug: string): string {
  switch (subjectSlug) {
    case "science":
      return "🧪";
    case "physics":
      return "⚛️";
    case "chemistry":
      return "🧫";
    case "biology":
      return "🧬";
    case "mathematics":
    case "maths":
      return "📐";
    case "english":
      return "📖";
    case "hindi":
      return "अ";
    case "social-science":
    case "social-studies":
    case "sst":
      return "🌍";
    case "computer-science":
    case "informatics-practices":
      return "💻";
    case "economics":
      return "📊";
    case "accountancy":
      return "🧾";
    case "business-studies":
      return "💼";
    default:
      return "📚";
  }
}

function mapBoard(board: BoardCatalogRecord): LearningTrackViewModel {
  return {
    id: board.id,
    title: board.name,
    shortName: board.shortName,
    slug: board.slug,
    description:
      board.description ??
      `${board.shortName} classes, subjects, chapters and learning resources.`,
    href: `/student/resources/${board.slug}`,
    category: "School Board",
    icon: getBoardIcon(board),
    availableSubjects: board._count.boardClassSubjects,
  };
}

function mapExam(exam: ExamCatalogRecord): LearningTrackViewModel {
  return {
    id: exam.id,
    title: exam.name,
    shortName: exam.shortName,
    slug: exam.slug,
    description:
      exam.description ??
      `${exam.shortName} subject-wise preparation resources and practice material.`,
    href: `/student/resources/${exam.slug}`,
    category: "Competitive Exam",
    icon: getExamIcon(exam),
    availableSubjects: exam._count.examSubjects,
  };
}

function mapResourceType(
  resourceType: ResourceTypeCatalogRecord,
): ResourceTypeViewModel {
  return {
    id: resourceType.id,
    name: resourceType.name,
    nameHindi: resourceType.nameHindi,
    code: resourceType.code,
    slug: resourceType.slug,
    description:
      resourceType.description ??
      `Explore published ${resourceType.name.toLowerCase()} resources.`,
    icon: resourceType.iconName || "📄",
    publishedResources: resourceType._count.resources,
  };
}

export async function getResourceCatalog(): Promise<ResourceCatalogViewModel> {
  const catalog = await findPublishedResourceCatalog();
  const schoolBoards = catalog.boards.map(mapBoard);
  const competitiveExams = catalog.exams.map(mapExam);
  const resourceTypes = catalog.resourceTypes.map(mapResourceType);

  return {
    schoolBoards,
    competitiveExams,
    resourceTypes,
    totals: {
      learningTracks: schoolBoards.length + competitiveExams.length,
      resourceTypes: resourceTypes.length,
      publishedResources: resourceTypes.reduce(
        (total, resourceType) => total + resourceType.publishedResources,
        0,
      ),
    },
  };
}

export async function getBoardClassCatalog(
  boardSlug: string,
): Promise<BoardClassCatalogViewModel | null> {
  const board = await findBoardClassCatalogBySlug(boardSlug);
  if (!board) return null;

  const classMap = new Map<
    string,
    {
      id: string;
      name: string;
      slug: string;
      numericLevel: number;
      sortOrder: number;
      subjectIds: Set<string>;
      chaptersCount: number;
    }
  >();

  for (const mapping of board.boardClassSubjects) {
    const classLevel = mapping.classLevel;
    const existing = classMap.get(classLevel.id);

    if (existing) {
      existing.subjectIds.add(mapping.subject.id);
      existing.chaptersCount += mapping._count.chapters;
      continue;
    }

    classMap.set(classLevel.id, {
      id: classLevel.id,
      name: classLevel.name,
      slug: classLevel.slug,
      numericLevel: classLevel.numericLevel,
      sortOrder: classLevel.sortOrder,
      subjectIds: new Set([mapping.subject.id]),
      chaptersCount: mapping._count.chapters,
    });
  }

  const classes = Array.from(classMap.values())
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.numericLevel - b.numericLevel,
    )
    .map(
      (classLevel): BoardClassViewModel => ({
        id: classLevel.id,
        name: classLevel.name,
        slug: classLevel.slug,
        numericLevel: classLevel.numericLevel,
        subjectsCount: classLevel.subjectIds.size,
        chaptersCount: classLevel.chaptersCount,
        href: `/student/resources/${board.slug}/${classLevel.slug}`,
      }),
    );

  return {
    board: {
      id: board.id,
      name: board.name,
      shortName: board.shortName,
      slug: board.slug,
      description:
        board.description ??
        `Choose your class to explore ${board.shortName} subjects and learning resources.`,
      category:
        board.boardType === "STATE"
          ? board.stateName
            ? `${board.stateName} State Board`
            : "State Board"
          : "National School Board",
    },
    classes,
    totals: {
      classes: classes.length,
      subjects: classes.reduce((total, item) => total + item.subjectsCount, 0),
      chapters: classes.reduce((total, item) => total + item.chaptersCount, 0),
    },
  };
}

export async function getClassSubjectCatalog(
  boardSlug: string,
  classSlug: string,
): Promise<ClassSubjectCatalogViewModel | null> {
  const records = await findBoardClassSubjects(boardSlug, classSlug);
  if (records.length === 0) return null;

  const firstRecord = records[0];
  const subjects = records.map((record): ClassSubjectViewModel => {
    const publishedResourcesCount = record.chapters.reduce(
      (total, chapter) => total + chapter._count.resources,
      0,
    );

    return {
      id: record.subject.id,
      name: record.subject.name,
      nameHindi: record.subject.nameHindi,
      slug: record.subject.slug,
      description:
        record.subject.description ??
        `Explore ${record.subject.name} chapters, notes, videos and practice resources.`,
      icon: record.subject.iconUrl || getSubjectIcon(record.subject.slug),
      chaptersCount: record._count.chapters,
      publishedResourcesCount,
      href: `/student/resources/${firstRecord.board.slug}/${firstRecord.classLevel.slug}/${record.subject.slug}`,
    };
  });

  return {
    board: {
      id: firstRecord.board.id,
      name: firstRecord.board.name,
      shortName: firstRecord.board.shortName,
      slug: firstRecord.board.slug,
    },
    classLevel: {
      id: firstRecord.classLevel.id,
      name: firstRecord.classLevel.name,
      slug: firstRecord.classLevel.slug,
      numericLevel: firstRecord.classLevel.numericLevel,
    },
    subjects,
    totals: {
      subjects: subjects.length,
      chapters: subjects.reduce((total, item) => total + item.chaptersCount, 0),
      publishedResources: subjects.reduce(
        (total, item) => total + item.publishedResourcesCount,
        0,
      ),
    },
  };
}

export async function getSubjectChapterCatalog(
  boardSlug: string,
  classSlug: string,
  subjectSlug: string,
): Promise<SubjectChapterCatalogViewModel | null> {
  const record = await findSubjectChapterCatalog(
    boardSlug,
    classSlug,
    subjectSlug,
  );

  if (!record) return null;

  const chapters = record.chapters.map((chapter): SubjectChapterViewModel => {
    const resourceTypeMap = new Map<
      string,
      { id: string; name: string; slug: string; icon: string; count: number }
    >();

    for (const resource of chapter.resources) {
      const type = resource.resourceType;
      const existing = resourceTypeMap.get(type.id);
      if (existing) {
        existing.count += 1;
      } else {
        resourceTypeMap.set(type.id, {
          id: type.id,
          name: type.name,
          slug: type.slug,
          icon: type.iconName || "📄",
          count: 1,
        });
      }
    }

    return {
      id: chapter.id,
      name: chapter.name,
      nameHindi: chapter.nameHindi,
      slug: chapter.slug,
      chapterNumber: chapter.chapterNumber,
      description:
        chapter.description ??
        `Explore notes, videos, questions and practice material for ${chapter.name}.`,
      publishedResourcesCount: chapter._count.resources,
      resourceTypes: Array.from(resourceTypeMap.values()),
      href: `/student/resources/${record.board.slug}/${record.classLevel.slug}/${record.subject.slug}/${chapter.slug}`,
    };
  });

  return {
    board: record.board,
    classLevel: record.classLevel,
    subject: {
      ...record.subject,
      description:
        record.subject.description ??
        `Explore chapter-wise ${record.subject.name} learning resources.`,
      icon: record.subject.iconUrl || getSubjectIcon(record.subject.slug),
    },
    chapters,
    totals: {
      chapters: chapters.length,
      publishedResources: chapters.reduce(
        (total, chapter) => total + chapter.publishedResourcesCount,
        0,
      ),
    },
  };
}

