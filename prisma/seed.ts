import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { chaptersForSubject as catalogueChapters } from "./chapter-catalogue";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing in the .env file.");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const classLevels = [
  { name: "Class 5", slug: "class-5", numericLevel: 5, sortOrder: 5 },
  { name: "Class 6", slug: "class-6", numericLevel: 6, sortOrder: 6 },
  { name: "Class 7", slug: "class-7", numericLevel: 7, sortOrder: 7 },
  { name: "Class 8", slug: "class-8", numericLevel: 8, sortOrder: 8 },
  { name: "Class 9", slug: "class-9", numericLevel: 9, sortOrder: 9 },
  { name: "Class 10", slug: "class-10", numericLevel: 10, sortOrder: 10 },
  { name: "Class 11", slug: "class-11", numericLevel: 11, sortOrder: 11 },
  { name: "Class 12", slug: "class-12", numericLevel: 12, sortOrder: 12 },
];

const subjects = [
  {
    name: "Mathematics",
    nameHindi: "गणित",
    slug: "mathematics",
    description:
      "Concepts, examples, exercises, formulas and exam preparation.",
    sortOrder: 1,
  },
  {
    name: "Science",
    nameHindi: "विज्ञान",
    slug: "science",
    description:
      "Physics, Chemistry and Biology learning resources for school classes.",
    sortOrder: 2,
  },
  {
    name: "English",
    nameHindi: "अंग्रेज़ी",
    slug: "english",
    description:
      "Literature, grammar, writing skills and reading comprehension.",
    sortOrder: 3,
  },
  {
    name: "Hindi",
    nameHindi: "हिंदी",
    slug: "hindi",
    description: "Hindi literature, grammar and writing skills.",
    sortOrder: 4,
  },
  {
    name: "Social Science",
    nameHindi: "सामाजिक विज्ञान",
    slug: "social-science",
    description:
      "History, Geography, Political Science and Economics resources.",
    sortOrder: 5,
  },
  {
    name: "Physics",
    nameHindi: "भौतिक विज्ञान",
    slug: "physics",
    description:
      "Physics concepts, derivations, numericals and exam preparation.",
    sortOrder: 6,
  },
  {
    name: "Chemistry",
    nameHindi: "रसायन विज्ञान",
    slug: "chemistry",
    description:
      "Chemistry concepts, reactions, equations and problem solving.",
    sortOrder: 7,
  },
  {
    name: "Biology",
    nameHindi: "जीव विज्ञान",
    slug: "biology",
    description:
      "Biology concepts, processes, diagrams and exam preparation.",
    sortOrder: 8,
  },
  {
    name: "Accountancy",
    nameHindi: "लेखाशास्त्र",
    slug: "accountancy",
    description: "Accounting principles, journal entries and practical work.",
    sortOrder: 9,
  },
  {
    name: "Economics",
    nameHindi: "अर्थशास्त्र",
    slug: "economics",
    description:
      "Microeconomics, macroeconomics, statistics and Indian economy.",
    sortOrder: 10,
  },
  {
    name: "Business Studies",
    nameHindi: "व्यवसाय अध्ययन",
    slug: "business-studies",
    description:
      "Business management, finance, marketing and organisational concepts.",
    sortOrder: 11,
  },
  {
    name: "Computer Science",
    nameHindi: "कंप्यूटर विज्ञान",
    slug: "computer-science",
    description:
      "Programming, computational thinking and computer science concepts.",
    sortOrder: 12,
  },
];

const resourceTypes = [
  {
    name: "Notes",
    nameHindi: "नोट्स",
    code: "NOTES",
    slug: "notes",
    description: "Chapter-wise explanations and revision notes.",
    iconName: "📄",
    sortOrder: 1,
  },
  {
    name: "NCERT Solutions",
    nameHindi: "एनसीईआरटी समाधान",
    code: "NCERT_SOLUTIONS",
    slug: "ncert-solutions",
    description: "Step-by-step solutions to NCERT textbook exercises.",
    iconName: "📘",
    sortOrder: 2,
  },
  {
    name: "NCERT Exemplar Solutions",
    nameHindi: "एनसीईआरटी उदाहरण समाधान",
    code: "NCERT_EXEMPLAR",
    slug: "ncert-exemplar",
    description: "Detailed solutions to NCERT Exemplar questions.",
    iconName: "📙",
    sortOrder: 3,
  },
  {
    name: "Video Lectures",
    nameHindi: "वीडियो लेक्चर",
    code: "VIDEO_LECTURES",
    slug: "video-lectures",
    description: "Chapter-wise lessons from different educators.",
    iconName: "🎥",
    sortOrder: 4,
  },
  {
    name: "Important Questions",
    nameHindi: "महत्वपूर्ण प्रश्न",
    code: "IMPORTANT_QUESTIONS",
    slug: "important-questions",
    description: "Exam-focused important questions selected chapter-wise.",
    iconName: "❓",
    sortOrder: 5,
  },
  {
    name: "Previous Year Questions",
    nameHindi: "पिछले वर्ष के प्रश्न",
    code: "PREVIOUS_YEAR_QUESTIONS",
    slug: "previous-year-questions",
    description: "Previous board and competitive examination questions.",
    iconName: "📚",
    sortOrder: 6,
  },
  {
    name: "Worksheets",
    nameHindi: "वर्कशीट",
    code: "WORKSHEETS",
    slug: "worksheets",
    description: "Printable and digital chapter practice worksheets.",
    iconName: "🗂️",
    sortOrder: 7,
  },
  {
    name: "Formula Sheets",
    nameHindi: "सूत्र पत्रक",
    code: "FORMULA_SHEETS",
    slug: "formula-sheets",
    description: "Important formulas and quick revision material.",
    iconName: "🧮",
    sortOrder: 8,
  },
  {
    name: "Mind Maps",
    nameHindi: "माइंड मैप",
    code: "MIND_MAPS",
    slug: "mind-maps",
    description: "Visual chapter summaries and concept connections.",
    iconName: "🧠",
    sortOrder: 9,
  },
  {
    name: "Chapter Tests",
    nameHindi: "अध्याय टेस्ट",
    code: "CHAPTER_TESTS",
    slug: "chapter-tests",
    description: "Chapter-level assessments and practice tests.",
    iconName: "📝",
    sortOrder: 10,
  },
  {
    name: "Sample Papers",
    nameHindi: "नमूना प्रश्न पत्र",
    code: "SAMPLE_PAPERS",
    slug: "sample-papers",
    description: "Full practice papers based on examination patterns.",
    iconName: "📑",
    sortOrder: 11,
  },
];

const class10ScienceChapters = [
  {
    name: "Chemical Reactions and Equations",
    nameHindi: "रासायनिक अभिक्रियाएँ एवं समीकरण",
    slug: "chemical-reactions-and-equations",
    chapterNumber: 1,
  },
  {
    name: "Acids, Bases and Salts",
    nameHindi: "अम्ल, क्षारक एवं लवण",
    slug: "acids-bases-and-salts",
    chapterNumber: 2,
  },
  {
    name: "Metals and Non-metals",
    nameHindi: "धातु एवं अधातु",
    slug: "metals-and-non-metals",
    chapterNumber: 3,
  },
  {
    name: "Carbon and Its Compounds",
    nameHindi: "कार्बन एवं उसके यौगिक",
    slug: "carbon-and-its-compounds",
    chapterNumber: 4,
  },
  {
    name: "Life Processes",
    nameHindi: "जैव प्रक्रम",
    slug: "life-processes",
    chapterNumber: 5,
  },
  {
    name: "Control and Coordination",
    nameHindi: "नियंत्रण एवं समन्वय",
    slug: "control-and-coordination",
    chapterNumber: 6,
  },
  {
    name: "How Do Organisms Reproduce?",
    nameHindi: "जीव जनन कैसे करते हैं?",
    slug: "how-do-organisms-reproduce",
    chapterNumber: 7,
  },
  {
    name: "Heredity",
    nameHindi: "आनुवंशिकता",
    slug: "heredity",
    chapterNumber: 8,
  },
  {
    name: "Light – Reflection and Refraction",
    nameHindi: "प्रकाश – परावर्तन तथा अपवर्तन",
    slug: "light-reflection-and-refraction",
    chapterNumber: 9,
  },
  {
    name: "The Human Eye and the Colourful World",
    nameHindi: "मानव नेत्र तथा रंगबिरंगा संसार",
    slug: "human-eye-and-colourful-world",
    chapterNumber: 10,
  },
  {
    name: "Electricity",
    nameHindi: "विद्युत",
    slug: "electricity",
    chapterNumber: 11,
  },
  {
    name: "Magnetic Effects of Electric Current",
    nameHindi: "विद्युत धारा के चुंबकीय प्रभाव",
    slug: "magnetic-effects-of-electric-current",
    chapterNumber: 12,
  },
  {
    name: "Our Environment",
    nameHindi: "हमारा पर्यावरण",
    slug: "our-environment",
    chapterNumber: 13,
  },
];

const class10MathsChapters = [
  {
    name: "Real Numbers",
    nameHindi: "वास्तविक संख्याएँ",
    slug: "real-numbers",
    chapterNumber: 1,
  },
  {
    name: "Polynomials",
    nameHindi: "बहुपद",
    slug: "polynomials",
    chapterNumber: 2,
  },
  {
    name: "Pair of Linear Equations in Two Variables",
    nameHindi: "दो चरों वाले रैखिक समीकरण युग्म",
    slug: "pair-of-linear-equations-in-two-variables",
    chapterNumber: 3,
  },
  {
    name: "Quadratic Equations",
    nameHindi: "द्विघात समीकरण",
    slug: "quadratic-equations",
    chapterNumber: 4,
  },
  {
    name: "Arithmetic Progressions",
    nameHindi: "समांतर श्रेढ़ियाँ",
    slug: "arithmetic-progressions",
    chapterNumber: 5,
  },
  {
    name: "Triangles",
    nameHindi: "त्रिभुज",
    slug: "triangles",
    chapterNumber: 6,
  },
  {
    name: "Coordinate Geometry",
    nameHindi: "निर्देशांक ज्यामिति",
    slug: "coordinate-geometry",
    chapterNumber: 7,
  },
  {
    name: "Introduction to Trigonometry",
    nameHindi: "त्रिकोणमिति का परिचय",
    slug: "introduction-to-trigonometry",
    chapterNumber: 8,
  },
  {
    name: "Applications of Trigonometry",
    nameHindi: "त्रिकोणमिति के अनुप्रयोग",
    slug: "applications-of-trigonometry",
    chapterNumber: 9,
  },
  {
    name: "Circles",
    nameHindi: "वृत्त",
    slug: "circles",
    chapterNumber: 10,
  },
  {
    name: "Areas Related to Circles",
    nameHindi: "वृत्तों से संबंधित क्षेत्रफल",
    slug: "areas-related-to-circles",
    chapterNumber: 11,
  },
  {
    name: "Surface Areas and Volumes",
    nameHindi: "पृष्ठीय क्षेत्रफल एवं आयतन",
    slug: "surface-areas-and-volumes",
    chapterNumber: 12,
  },
  {
    name: "Statistics",
    nameHindi: "सांख्यिकी",
    slug: "statistics",
    chapterNumber: 13,
  },
  {
    name: "Probability",
    nameHindi: "प्रायिकता",
    slug: "probability",
    chapterNumber: 14,
  },
];

async function seedRoles() {
  const roleNames = [
    "STUDENT",
    "PARENT",
    "TEACHER",
    "COACHING_OWNER",
    "ADMIN",
  ] as const;

  for (const name of roleNames) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}

async function seedBoards() {
  const boardData = [
    {
      name: "Central Board of Secondary Education",
      shortName: "CBSE",
      slug: "cbse",
      boardType: "NATIONAL" as const,
      stateName: null,
      stateCode: null,
      description:
        "CBSE learning resources for Classes 6 to 12 organised by subject and chapter.",
      sortOrder: 1,
    },
    {
      name: "Council for the Indian School Certificate Examinations",
      shortName: "ICSE",
      slug: "icse",
      boardType: "NATIONAL" as const,
      stateName: null,
      stateCode: null,
      description:
        "ICSE learning resources organised by class, subject and chapter.",
      sortOrder: 2,
    },
    {
      name: "Uttar Pradesh Madhyamik Shiksha Parishad",
      shortName: "UP Board",
      slug: "up-board",
      boardType: "STATE" as const,
      stateName: "Uttar Pradesh",
      stateCode: "UP",
      description:
        "UP Board resources organised by class, subject and chapter.",
      sortOrder: 10,
    },
    {
      name: "Board of Secondary Education Rajasthan",
      shortName: "RBSE",
      slug: "rajasthan-board",
      boardType: "STATE" as const,
      stateName: "Rajasthan",
      stateCode: "RJ",
      description:
        "Rajasthan Board resources organised by class, subject and chapter.",
      sortOrder: 11,
    },
    {
      name: "Bihar School Examination Board",
      shortName: "BSEB",
      slug: "bihar-board",
      boardType: "STATE" as const,
      stateName: "Bihar",
      stateCode: "BR",
      description:
        "Bihar Board resources organised by class, subject and chapter.",
      sortOrder: 12,
    },
  ];

  const boardMap = new Map<string, string>();

  for (const board of boardData) {
    const savedBoard = await prisma.board.upsert({
      where: { slug: board.slug },
      update: {
        name: board.name,
        shortName: board.shortName,
        boardType: board.boardType,
        stateName: board.stateName,
        stateCode: board.stateCode,
        description: board.description,
        sortOrder: board.sortOrder,
        isActive: true,
      },
      create: {
        ...board,
        isActive: true,
      },
    });

    boardMap.set(savedBoard.slug, savedBoard.id);
  }

  return boardMap;
}

async function seedClassLevels() {
  const classMap = new Map<number, string>();

  for (const classLevel of classLevels) {
    const savedClass = await prisma.classLevel.upsert({
      where: {
        numericLevel: classLevel.numericLevel,
      },
      update: {
        name: classLevel.name,
        slug: classLevel.slug,
        sortOrder: classLevel.sortOrder,
        isActive: true,
      },
      create: {
        ...classLevel,
        isActive: true,
      },
    });

    classMap.set(savedClass.numericLevel, savedClass.id);
  }

  return classMap;
}

async function seedSubjects() {
  const subjectMap = new Map<string, string>();

  for (const subject of subjects) {
    const savedSubject = await prisma.subject.upsert({
      where: {
        slug: subject.slug,
      },
      update: {
        name: subject.name,
        nameHindi: subject.nameHindi,
        description: subject.description,
        sortOrder: subject.sortOrder,
        isActive: true,
      },
      create: {
        ...subject,
        isActive: true,
      },
    });

    subjectMap.set(savedSubject.slug, savedSubject.id);
  }

  return subjectMap;
}

async function connectBoardSubjects(
  boardId: string,
  classMap: Map<number, string>,
  subjectMap: Map<string, string>
) {
  const mappings: Record<number, string[]> = {
    5: [
      "mathematics",
      "science",
      "english",
      "hindi",
      "social-science",
      "computer-science",
    ],
    6: [
      "mathematics",
      "science",
      "english",
      "hindi",
      "social-science",
      "computer-science",
    ],
    7: [
      "mathematics",
      "science",
      "english",
      "hindi",
      "social-science",
      "computer-science",
    ],
    8: [
      "mathematics",
      "science",
      "english",
      "hindi",
      "social-science",
      "computer-science",
    ],
    9: [
      "mathematics",
      "science",
      "english",
      "hindi",
      "social-science",
      "computer-science",
    ],
    10: [
      "mathematics",
      "science",
      "english",
      "hindi",
      "social-science",
      "computer-science",
    ],
    11: [
      "mathematics",
      "physics",
      "chemistry",
      "biology",
      "english",
      "accountancy",
      "economics",
      "business-studies",
      "computer-science",
    ],
    12: [
      "mathematics",
      "physics",
      "chemistry",
      "biology",
      "english",
      "accountancy",
      "economics",
      "business-studies",
      "computer-science",
    ],
  };

  for (const [numericLevelText, subjectSlugs] of Object.entries(mappings)) {
    const numericLevel = Number(numericLevelText);
    const classLevelId = classMap.get(numericLevel);

    if (!classLevelId) continue;

    for (const subjectSlug of subjectSlugs) {
      const subjectId = subjectMap.get(subjectSlug);

      if (!subjectId) continue;

      await prisma.boardClassSubject.upsert({
        where: {
          boardId_classLevelId_subjectId: {
            boardId,
            classLevelId,
            subjectId,
          },
        },
        update: {
          isActive: true,
        },
        create: {
          boardId,
          classLevelId,
          subjectId,
          isActive: true,
        },
      });
    }
  }
}

async function seedExams(subjectMap: Map<string, string>) {
  const exams = [
    {
      name: "Joint Entrance Examination",
      shortName: "JEE",
      slug: "jee",
      examType: "JEE" as const,
      description:
        "Physics, Chemistry and Mathematics preparation resources for JEE.",
      sortOrder: 1,
      subjects: ["physics", "chemistry", "mathematics"],
    },
    {
      name: "National Eligibility cum Entrance Test",
      shortName: "NEET",
      slug: "neet",
      examType: "NEET" as const,
      description:
        "Physics, Chemistry and Biology preparation resources for NEET.",
      sortOrder: 2,
      subjects: ["physics", "chemistry", "biology"],
    },
    {
      name: "Common University Entrance Test",
      shortName: "CUET",
      slug: "cuet",
      examType: "CUET" as const,
      description:
        "Subject-wise learning, revision and practice resources for CUET.",
      sortOrder: 3,
      subjects: [
        "english",
        "mathematics",
        "physics",
        "chemistry",
        "biology",
        "accountancy",
        "economics",
        "business-studies",
      ],
    },
  ];

  for (const examData of exams) {
    const exam = await prisma.exam.upsert({
      where: {
        slug: examData.slug,
      },
      update: {
        name: examData.name,
        shortName: examData.shortName,
        examType: examData.examType,
        description: examData.description,
        sortOrder: examData.sortOrder,
        isActive: true,
      },
      create: {
        name: examData.name,
        shortName: examData.shortName,
        slug: examData.slug,
        examType: examData.examType,
        description: examData.description,
        sortOrder: examData.sortOrder,
        isActive: true,
      },
    });

    for (const [index, subjectSlug] of examData.subjects.entries()) {
      const subjectId = subjectMap.get(subjectSlug);

      if (!subjectId) continue;

      await prisma.examSubject.upsert({
        where: {
          examId_subjectId: {
            examId: exam.id,
            subjectId,
          },
        },
        update: {
          isActive: true,
          sortOrder: index + 1,
        },
        create: {
          examId: exam.id,
          subjectId,
          isActive: true,
          sortOrder: index + 1,
        },
      });
    }
  }
}

async function seedResourceTypes() {
  for (const resourceType of resourceTypes) {
    await prisma.resourceType.upsert({
      where: {
        code: resourceType.code,
      },
      update: {
        name: resourceType.name,
        nameHindi: resourceType.nameHindi,
        slug: resourceType.slug,
        description: resourceType.description,
        iconName: resourceType.iconName,
        sortOrder: resourceType.sortOrder,
        isActive: true,
      },
      create: {
        ...resourceType,
        isActive: true,
      },
    });
  }
}

function subjectSlugsForClass(numericLevel: number) {
  return numericLevel >= 11
    ? ["physics", "chemistry", "mathematics"]
    : ["science", "mathematics"];
}

function chaptersForSubject(numericLevel: number, subjectSlug: string) {
  if (numericLevel === 10 && subjectSlug === "science") return class10ScienceChapters;
  if (numericLevel === 10 && subjectSlug === "mathematics") return class10MathsChapters;
  const chapters = catalogueChapters(numericLevel, subjectSlug);
  if (chapters.length === 0) {
    throw new Error(`No chapters defined for class ${numericLevel} ${subjectSlug}.`);
  }
  return chapters;
}

async function upsertChapters(
  boardClassSubjectId: string,
  chapters: Array<{ name: string; nameHindi: string; slug: string; chapterNumber: number }>,
) {
  for (const chapter of chapters) {
    await prisma.chapter.upsert({
      where: {
        boardClassSubjectId_slug: {
          boardClassSubjectId,
          slug: chapter.slug,
        },
      },
      update: {
        name: chapter.name,
        nameHindi: chapter.nameHindi,
        chapterNumber: chapter.chapterNumber,
        sortOrder: chapter.chapterNumber,
        isActive: true,
      },
      create: {
        boardClassSubjectId,
        name: chapter.name,
        nameHindi: chapter.nameHindi,
        slug: chapter.slug,
        chapterNumber: chapter.chapterNumber,
        sortOrder: chapter.chapterNumber,
        isActive: true,
      },
    });
  }
}

async function seedChapters(
  boardId: string,
  classMap: Map<number, string>,
  subjectMap: Map<string, string>
) {
  for (const numericLevel of [5, 6, 7, 8, 9, 10, 11, 12]) {
    const classLevelId = classMap.get(numericLevel);

    if (!classLevelId) {
      throw new Error(`Class ${numericLevel} was not created.`);
    }

    for (const subjectSlug of subjectSlugsForClass(numericLevel)) {
      const subjectId = subjectMap.get(subjectSlug);

      if (!subjectId) {
        throw new Error(`Subject ${subjectSlug} was not created.`);
      }

      const mapping = await prisma.boardClassSubject.findUnique({
        where: {
          boardId_classLevelId_subjectId: {
            boardId,
            classLevelId,
            subjectId,
          },
        },
      });

      if (!mapping) {
        throw new Error(`Class ${numericLevel} ${subjectSlug} mapping was not found.`);
      }

      await upsertChapters(mapping.id, chaptersForSubject(numericLevel, subjectSlug));
    }
  }
}

async function main() {
  console.log("Starting VirtualKaksha database seed...");

  await seedRoles();

  const boardMap = await seedBoards();
  const classMap = await seedClassLevels();
  const subjectMap = await seedSubjects();

  for (const boardSlug of [
    "cbse",
    "icse",
    "up-board",
    "rajasthan-board",
    "bihar-board",
  ]) {
    const boardId = boardMap.get(boardSlug);

    if (boardId) {
      await connectBoardSubjects(boardId, classMap, subjectMap);
    }
  }

  await seedExams(subjectMap);
  await seedResourceTypes();

  for (const boardSlug of ["cbse", "icse"]) {
    const boardId = boardMap.get(boardSlug);

    if (!boardId) {
      throw new Error(`${boardSlug.toUpperCase()} board was not created.`);
    }

    await seedChapters(boardId, classMap, subjectMap);
  }

  await prisma.chapter.updateMany({
    where: { slug: "introduction", name: "Introduction" },
    data: { isActive: false },
  });

  console.log("VirtualKaksha database seed completed successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("VirtualKaksha seed failed:");
    console.error(error);

    await prisma.$disconnect();
    process.exit(1);
  });