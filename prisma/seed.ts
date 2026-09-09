import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { chaptersForSubject as catalogueChapters } from "./chapter-catalogue";
import { class12ChemistryQuestions } from "./practice-questions/class-12-chemistry";
import { class12MathematicsQuestions } from "./practice-questions/class-12-mathematics";
import { class12PhysicsQuestions } from "./practice-questions/class-12-physics";
import type { PracticeQuestionSeed } from "./practice-questions/types";

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
    name: "Previous Year Papers",
    nameHindi: "पिछले वर्ष के प्रश्न पत्र",
    code: "PREVIOUS_YEAR_QUESTIONS",
    slug: "previous-year-questions",
    description: "Previous board and competitive examination papers.",
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

const samplePracticeQuestions: Array<{
  chapterSlug: string;
  prompt: string;
  options: [string, string, string, string];
  correctOption: number;
  explanation: string;
}> = [
  {
    chapterSlug: "chemical-reactions-and-equations",
    prompt: "Which observation best shows that a chemical reaction has taken place?",
    options: ["Ice melting into water", "A new substance forming with a colour change", "Salt dissolving in water", "Water evaporating from a plate"],
    correctOption: 1,
    explanation: "A chemical reaction produces new substances, often with a colour change, gas, or temperature change.",
  },
  {
    chapterSlug: "chemical-reactions-and-equations",
    prompt: "Balancing a chemical equation is required because of the law of conservation of",
    options: ["energy only", "momentum", "mass", "volume"],
    correctOption: 2,
    explanation: "Atoms are neither created nor destroyed, so mass stays the same on both sides.",
  },
  {
    chapterSlug: "chemical-reactions-and-equations",
    prompt: "Rusting of iron is an example of",
    options: ["a combination reaction", "a displacement reaction", "a double displacement reaction", "a photochemical decomposition only"],
    correctOption: 0,
    explanation: "Iron combines with oxygen (and moisture) to form rust.",
  },
  {
    chapterSlug: "chemical-reactions-and-equations",
    prompt: "The reaction 2AgCl → 2Ag + Cl2 in sunlight is",
    options: ["combination", "displacement", "photochemical decomposition", "neutralisation"],
    correctOption: 2,
    explanation: "Silver chloride decomposes in light, which is photochemical decomposition.",
  },
  {
    chapterSlug: "chemical-reactions-and-equations",
    prompt: "In a displacement reaction, a more reactive metal",
    options: ["combines with a less reactive metal", "replaces a less reactive metal from its compound", "splits into two new metals", "always forms an acid"],
    correctOption: 1,
    explanation: "The more reactive metal displaces the less reactive one from its salt solution.",
  },
  {
    chapterSlug: "chemical-reactions-and-equations",
    prompt: "Which of these is an oxidation process?",
    options: ["Gain of hydrogen", "Loss of oxygen", "Gain of electrons only", "Gain of oxygen"],
    correctOption: 3,
    explanation: "Oxidation can be described as gain of oxygen or loss of hydrogen/electrons.",
  },
  {
    chapterSlug: "chemical-reactions-and-equations",
    prompt: "A reaction that releases heat is called",
    options: ["endothermic", "exothermic", "photochemical", "neutral"],
    correctOption: 1,
    explanation: "Exothermic reactions give out heat to the surroundings.",
  },
  {
    chapterSlug: "chemical-reactions-and-equations",
    prompt: "BaCl2 + Na2SO4 → BaSO4 + 2NaCl is an example of",
    options: ["combination", "decomposition", "double displacement", "displacement"],
    correctOption: 2,
    explanation: "The cations exchange partners, which is double displacement.",
  },
  {
    chapterSlug: "chemical-reactions-and-equations",
    prompt: "Which change is physical rather than chemical?",
    options: ["Burning of magnesium", "Rusting of an iron nail", "Melting of wax", "Cooking of food"],
    correctOption: 2,
    explanation: "Melting changes state but not the chemical identity of wax.",
  },
  {
    chapterSlug: "chemical-reactions-and-equations",
    prompt: "Oiling or painting iron prevents rusting mainly by",
    options: ["adding more oxygen", "keeping air and moisture away", "making iron more reactive", "converting iron into copper"],
    correctOption: 1,
    explanation: "A coating cuts off contact with oxygen and water needed for rusting.",
  },
  {
    chapterSlug: "acids-bases-and-salts",
    prompt: "An acid turns blue litmus paper",
    options: ["blue", "green", "red", "colourless"],
    correctOption: 2,
    explanation: "Acids turn blue litmus red.",
  },
  {
    chapterSlug: "acids-bases-and-salts",
    prompt: "Aqueous solutions of bases generally feel",
    options: ["oily or soapy", "sticky like honey", "dry like chalk", "cold like ice only"],
    correctOption: 0,
    explanation: "Bases often feel soapy because they react with oils on the skin.",
  },
  {
    chapterSlug: "acids-bases-and-salts",
    prompt: "The pH of a strong acid solution is typically",
    options: ["close to 14", "exactly 7", "less than 7", "always 10"],
    correctOption: 2,
    explanation: "Acids have pH below 7; strong acids are much lower than 7.",
  },
  {
    chapterSlug: "acids-bases-and-salts",
    prompt: "Neutralisation of an acid with a base produces",
    options: ["only hydrogen gas", "salt and water", "only oxygen", "metal and acid"],
    correctOption: 1,
    explanation: "Acid + base → salt + water.",
  },
  {
    chapterSlug: "acids-bases-and-salts",
    prompt: "Which of the following is a strong acid among typical school examples?",
    options: ["Acetic acid", "Citric acid", "Hydrochloric acid", "Carbonic acid"],
    correctOption: 2,
    explanation: "HCl ionises almost completely in water, so it is a strong acid.",
  },
  {
    chapterSlug: "acids-bases-and-salts",
    prompt: "Tooth enamel starts to corrode when the mouth pH falls below about",
    options: ["9.5", "7.0", "5.5", "2.0"],
    correctOption: 2,
    explanation: "Acidic food and bacteria can drop mouth pH below 5.5 and damage enamel.",
  },
  {
    chapterSlug: "acids-bases-and-salts",
    prompt: "Plaster of Paris is obtained by heating",
    options: ["washing soda", "gypsum", "bleaching powder", "baking soda"],
    correctOption: 1,
    explanation: "Controlled heating of gypsum gives plaster of Paris.",
  },
  {
    chapterSlug: "acids-bases-and-salts",
    prompt: "Bleaching powder is produced by the action of chlorine on",
    options: ["dry slaked lime", "washing soda", "common salt only", "sulphuric acid"],
    correctOption: 0,
    explanation: "Chlorine gas passed over dry slaked lime gives bleaching powder.",
  },
  {
    chapterSlug: "acids-bases-and-salts",
    prompt: "Washing soda is",
    options: ["sodium hydrogen carbonate", "calcium hydroxide", "sodium carbonate", "ammonium chloride"],
    correctOption: 2,
    explanation: "Washing soda is sodium carbonate, used in cleaning and glass making.",
  },
  {
    chapterSlug: "acids-bases-and-salts",
    prompt: "Which indicator is an olfactory indicator?",
    options: ["Litmus", "Methyl orange", "Vanilla essence", "Phenolphthalein"],
    correctOption: 2,
    explanation: "Olfactory indicators such as vanilla change smell in acid or base.",
  },
  {
    chapterSlug: "metals-and-non-metals",
    prompt: "Which property is typical of metals?",
    options: ["They are generally brittle in solid state", "They are generally good conductors of heat", "They form acidic oxides only", "They are poor conductors of electricity"],
    correctOption: 1,
    explanation: "Most metals conduct heat and electricity well and are malleable and ductile.",
  },
  {
    chapterSlug: "metals-and-non-metals",
    prompt: "The most reactive metal among these is",
    options: ["Copper", "Iron", "Sodium", "Gold"],
    correctOption: 2,
    explanation: "Sodium is a highly reactive alkali metal; gold is among the least reactive.",
  },
  {
    chapterSlug: "metals-and-non-metals",
    prompt: "Anodising is used to protect",
    options: ["Iron from rusting", "Aluminium by thickening its oxide layer", "Copper from turning green", "Gold from tarnishing"],
    correctOption: 1,
    explanation: "Anodising thickens the natural oxide film on aluminium.",
  },
  {
    chapterSlug: "metals-and-non-metals",
    prompt: "Which oxide is amphoteric?",
    options: ["Na2O", "MgO", "Al2O3", "SO2"],
    correctOption: 2,
    explanation: "Aluminium oxide reacts with both acids and bases, so it is amphoteric.",
  },
  {
    chapterSlug: "metals-and-non-metals",
    prompt: "In the activity series, a metal can displace another metal from solution if it is",
    options: ["less reactive", "more reactive", "heavier", "a non-metal"],
    correctOption: 1,
    explanation: "A more reactive metal displaces a less reactive metal from its salt solution.",
  },
  {
    chapterSlug: "metals-and-non-metals",
    prompt: "Ionic compounds in the solid state generally",
    options: ["conduct electricity well", "have low melting points", "do not conduct electricity", "are always liquids"],
    correctOption: 2,
    explanation: "Ions are not free to move in the solid lattice, so they do not conduct until molten or dissolved.",
  },
  {
    chapterSlug: "metals-and-non-metals",
    prompt: "The process used to obtain a metal from its ore is called",
    options: ["galvanisation", "metallurgy", "neutralisation", "photosynthesis"],
    correctOption: 1,
    explanation: "Metallurgy covers extraction and refining of metals from ores.",
  },
  {
    chapterSlug: "carbon-and-its-compounds",
    prompt: "Carbon forms a large number of compounds mainly because of",
    options: ["its metallic nature", "catenation and tetravalency", "its high density", "its radioactivity"],
    correctOption: 1,
    explanation: "Carbon can form four bonds and long chains with other carbon atoms.",
  },
  {
    chapterSlug: "carbon-and-its-compounds",
    prompt: "A hydrocarbon with only single bonds is called",
    options: ["an alkene", "an alkyne", "an alkane", "an ester"],
    correctOption: 2,
    explanation: "Alkanes are saturated hydrocarbons with C–C single bonds.",
  },
  {
    chapterSlug: "carbon-and-its-compounds",
    prompt: "Ethanol on heating with alkaline KMnO4 is oxidised to",
    options: ["ethene", "ethanoic acid", "methane", "glucose"],
    correctOption: 1,
    explanation: "Alkaline KMnO4 oxidises ethanol to ethanoic acid.",
  },
  {
    chapterSlug: "carbon-and-its-compounds",
    prompt: "Soap molecules clean grease because they have",
    options: ["only a hydrophilic part", "only a hydrophobic part", "both hydrophobic and hydrophilic parts", "no charged groups"],
    correctOption: 2,
    explanation: "The tail mixes with oil and the head mixes with water, forming micelles.",
  },
  {
    chapterSlug: "carbon-and-its-compounds",
    prompt: "The functional group in carboxylic acids is",
    options: ["–OH", "–CHO", "–COOH", "–CO–"],
    correctOption: 2,
    explanation: "Carboxylic acids contain the –COOH group.",
  },
  {
    chapterSlug: "carbon-and-its-compounds",
    prompt: "Covalent compounds generally",
    options: ["have high melting points and conduct in solid state", "have low melting points and do not conduct electricity", "are always soluble in water", "are all metals"],
    correctOption: 1,
    explanation: "They have weak intermolecular forces and no free ions or electrons.",
  },
  {
    chapterSlug: "carbon-and-its-compounds",
    prompt: "Addition reactions are characteristic of",
    options: ["saturated hydrocarbons", "unsaturated hydrocarbons", "ionic salts", "noble gases"],
    correctOption: 1,
    explanation: "Alkenes and alkynes add hydrogen, halogens or water across the multiple bond.",
  },
  {
    chapterSlug: "life-processes",
    prompt: "The process by which green plants make food using sunlight is",
    options: ["respiration", "transpiration", "photosynthesis", "excretion"],
    correctOption: 2,
    explanation: "Photosynthesis converts carbon dioxide and water into glucose using sunlight.",
  },
  {
    chapterSlug: "life-processes",
    prompt: "In humans, most digestion of food occurs in the",
    options: ["mouth", "stomach", "small intestine", "large intestine"],
    correctOption: 2,
    explanation: "The small intestine is the main site of digestion and absorption.",
  },
  {
    chapterSlug: "life-processes",
    prompt: "Which blood vessel carries oxygenated blood from the lungs to the heart?",
    options: ["Pulmonary artery", "Pulmonary vein", "Vena cava", "Aorta from the lungs"],
    correctOption: 1,
    explanation: "Pulmonary veins bring oxygen-rich blood from the lungs to the left atrium.",
  },
  {
    chapterSlug: "life-processes",
    prompt: "The breakdown of glucose in the presence of oxygen is called",
    options: ["anaerobic respiration", "aerobic respiration", "transpiration", "fermentation only in leaves"],
    correctOption: 1,
    explanation: "Aerobic respiration uses oxygen and releases more energy than anaerobic respiration.",
  },
  {
    chapterSlug: "life-processes",
    prompt: "The basic filtration unit in the human kidney is the",
    options: ["neuron", "alveolus", "nephron", "capillary only"],
    correctOption: 2,
    explanation: "Each kidney contains many nephrons that filter blood and form urine.",
  },
  {
    chapterSlug: "life-processes",
    prompt: "Stomata in leaves mainly help in",
    options: ["absorbing minerals from soil", "exchange of gases and transpiration", "transport of food to roots", "producing blood cells"],
    correctOption: 1,
    explanation: "Stomata allow CO2 in, O2 out, and water vapour to leave during transpiration.",
  },
];

async function seedPracticeQuestions() {
  const questions: PracticeQuestionSeed[] = [
    ...samplePracticeQuestions.map((question) => ({
      boardSlug: "cbse",
      classSlug: "class-10",
      subjectSlug: "science",
      ...question,
    })),
    ...class12PhysicsQuestions,
    ...class12ChemistryQuestions,
    ...class12MathematicsQuestions,
  ];

  const groups = new Map<string, PracticeQuestionSeed[]>();
  for (const question of questions) {
    const key = `${question.boardSlug}:${question.classSlug}:${question.subjectSlug}`;
    const group = groups.get(key) ?? [];
    group.push(question);
    groups.set(key, group);
  }

  const now = new Date();

  for (const [key, group] of groups) {
    const [boardSlug, classSlug, subjectSlug] = key.split(":");
    const board = await prisma.board.findUnique({ where: { slug: boardSlug }, select: { id: true } });
    const classLevel = await prisma.classLevel.findUnique({ where: { slug: classSlug }, select: { id: true } });
    const subject = await prisma.subject.findUnique({ where: { slug: subjectSlug }, select: { id: true } });

    if (!board || !classLevel || !subject) {
      throw new Error(`${boardSlug} ${classSlug} ${subjectSlug} was not created.`);
    }

    const mapping = await prisma.boardClassSubject.findUnique({
      where: {
        boardId_classLevelId_subjectId: {
          boardId: board.id,
          classLevelId: classLevel.id,
          subjectId: subject.id,
        },
      },
      select: { id: true },
    });

    if (!mapping) {
      throw new Error(`${boardSlug} ${classSlug} ${subjectSlug} mapping was not created.`);
    }

    const chapterSlugs = [...new Set(group.map((question) => question.chapterSlug))];
    const chapters = await prisma.chapter.findMany({
      where: {
        boardClassSubjectId: mapping.id,
        slug: { in: chapterSlugs },
      },
      select: { id: true, slug: true },
    });
    const chapterIds = new Map(chapters.map((chapter) => [chapter.slug, chapter.id]));

    const existing = await prisma.practiceQuestion.findMany({
      where: { chapterId: { in: [...chapterIds.values()] } },
      select: { chapterId: true, prompt: true },
    });
    const seen = new Set(existing.map((row) => `${row.chapterId}::${row.prompt}`));

    const data = [];
    for (const question of group) {
      const chapterId = chapterIds.get(question.chapterSlug);
      if (!chapterId) {
        throw new Error(`Chapter ${question.chapterSlug} was not created for ${key}.`);
      }
      if (seen.has(`${chapterId}::${question.prompt}`)) continue;
      data.push({
        chapterId,
        prompt: question.prompt,
        optionA: question.options[0],
        optionB: question.options[1],
        optionC: question.options[2],
        optionD: question.options[3],
        correctOption: question.correctOption,
        explanation: question.explanation,
        status: "PUBLISHED" as const,
        publishedAt: now,
        reviewedAt: now,
      });
    }

    if (data.length) {
      await prisma.practiceQuestion.createMany({ data });
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

  await seedPracticeQuestions();

  console.log("VirtualKaksha database seed completed successfully.");
}

const run = process.argv.includes("--practice-questions-only")
  ? seedPracticeQuestions().then(() => {
      console.log("Practice questions seed completed successfully.");
    })
  : main();

run
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("VirtualKaksha seed failed:");
    console.error(error);

    await prisma.$disconnect();
    process.exit(1);
  });