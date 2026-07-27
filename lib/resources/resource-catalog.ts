import "server-only";

import {
  findBoardClassCatalogBySlug,
  findPublishedResourceCatalog,
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

function getBoardIcon(board: BoardCatalogRecord): string {
  if (board.slug === "cbse") {
    return "📘";
  }

  if (board.slug === "icse") {
    return "📗";
  }

  if (board.boardType === "STATE") {
    return "🏫";
  }

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

  if (!board) {
    return null;
  }

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

  for (const boardClassSubject of board.boardClassSubjects) {
    const classLevel = boardClassSubject.classLevel;
    const existingClass = classMap.get(classLevel.id);

    if (existingClass) {
      existingClass.subjectIds.add(boardClassSubject.subject.id);
      existingClass.chaptersCount += boardClassSubject._count.chapters;
      continue;
    }

    classMap.set(classLevel.id, {
      id: classLevel.id,
      name: classLevel.name,
      slug: classLevel.slug,
      numericLevel: classLevel.numericLevel,
      sortOrder: classLevel.sortOrder,
      subjectIds: new Set([boardClassSubject.subject.id]),
      chaptersCount: boardClassSubject._count.chapters,
    });
  }

  const classes = Array.from(classMap.values())
    .sort(
      (firstClass, secondClass) =>
        firstClass.sortOrder - secondClass.sortOrder ||
        firstClass.numericLevel - secondClass.numericLevel,
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
      subjects: classes.reduce(
        (total, classLevel) => total + classLevel.subjectsCount,
        0,
      ),
      chapters: classes.reduce(
        (total, classLevel) => total + classLevel.chaptersCount,
        0,
      ),
    },
  };
}