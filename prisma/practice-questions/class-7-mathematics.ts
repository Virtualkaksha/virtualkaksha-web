import { buildSchoolChapterBank } from "./school-question-bank";
import { assertThirtyPerChapter, cbsePyq, type PracticeQuestionSeed } from "./types";

const q = cbsePyq.bind(null, "class-7", "mathematics");
void q;

const chapters = {
  integers: ["number line", "addition of integers", "subtraction of integers", "multiplication of integers", "division of integers", "properties of integers"],
  "fractions-and-decimals": ["proper fractions", "improper fractions", "decimal operations", "multiplication of fractions", "division of fractions", "applications of decimals"],
  "data-handling": ["mean", "median", "mode", "range", "bar graphs", "double bar graphs"],
  "simple-equations": ["variables", "equations", "transposition", "balancing method", "word problems", "verification"],
  "lines-and-angles": ["complementary angles", "supplementary angles", "vertically opposite angles", "transversal", "parallel lines", "angle pairs"],
  "the-triangle-and-its-properties": ["angle sum property", "exterior angle property", "medians", "altitudes", "Pythagoras property", "triangle inequality"],
  "congruence-of-triangles": ["congruence", "SSS criterion", "SAS criterion", "ASA criterion", "RHS criterion", "corresponding parts"],
  "comparing-quantities": ["ratios", "percentages", "profit and loss", "discount", "simple interest", "unitary method"],
  "rational-numbers": ["number line", "standard form", "operations", "additive inverse", "multiplicative inverse", "properties"],
  "practical-geometry": ["construction tools", "line segments", "angles", "triangles", "perpendicular bisector", "parallel lines"],
  "perimeter-and-area": ["perimeter", "area of rectangle", "area of square", "area of parallelogram", "area of triangle", "unit conversion"],
  "algebraic-expressions": ["terms", "coefficients", "like terms", "addition", "subtraction", "simple identities"],
  "exponents-and-powers": ["exponents", "powers", "laws of exponents", "standard form", "large numbers", "negative powers"],
  symmetry: ["line symmetry", "rotational symmetry", "order of rotation", "reflection", "regular figures", "symmetrical patterns"],
  "visualising-solid-shapes": ["faces edges and vertices", "nets", "views of solids", "Euler relation", "polyhedra", "solid shapes"],
} as const;

export const class7MathematicsQuestions: PracticeQuestionSeed[] = buildSchoolChapterBank("class-7", "mathematics", chapters);
assertThirtyPerChapter(class7MathematicsQuestions, Object.keys(chapters));
