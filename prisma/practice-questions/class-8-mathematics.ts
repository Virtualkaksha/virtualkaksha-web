import { buildSchoolChapterBank } from "./school-question-bank";
import { assertThirtyPerChapter, cbsePyq, type PracticeQuestionSeed } from "./types";

const q = cbsePyq.bind(null, "class-8", "mathematics");
void q;

const chapters = {
  "rational-numbers": ["properties of rational numbers", "number line", "additive inverse", "multiplicative inverse", "operations on rational numbers", "closure property"],
  "linear-equations-in-one-variable": ["linear equations", "transposition", "simplification", "equation solving", "word problems", "verification of solutions"],
  "understanding-quadrilaterals": ["polygons", "sum of exterior angles", "sum of interior angles", "types of quadrilaterals", "parallelogram properties", "regular polygons"],
  "data-handling": ["organising data", "bar graphs", "pie charts", "probability", "chance experiments", "data interpretation"],
  "squares-and-square-roots": ["perfect squares", "square roots", "prime factorisation", "long division method", "Pythagorean triples", "square numbers"],
  "cubes-and-cube-roots": ["perfect cubes", "cube roots", "prime factorisation", "cube patterns", "cube numbers", "estimation"],
  "comparing-quantities": ["percentages", "profit and loss", "discount", "simple interest", "compound interest", "ratios"],
  "algebraic-expressions-and-identities": ["terms and factors", "like terms", "addition of expressions", "multiplication of expressions", "standard identities", "applications of identities"],
  mensuration: ["area of polygons", "trapezium area", "general quadrilateral area", "surface area", "volume", "unit conversion"],
  "exponents-and-powers": ["laws of exponents", "negative exponents", "standard form", "powers of ten", "large numbers", "small numbers"],
  "direct-and-inverse-proportions": ["direct proportion", "inverse proportion", "unitary method", "tables of values", "real-life applications", "comparison of quantities"],
  factorisation: ["common factors", "factorisation by grouping", "identities", "division of algebraic expressions", "zeroes", "simplification"],
  "introduction-to-graphs": ["Cartesian plane", "linear graphs", "coordinates", "reading graphs", "distance-time graphs", "applications of graphs"],
} as const;

export const class8MathematicsQuestions: PracticeQuestionSeed[] = buildSchoolChapterBank("class-8", "mathematics", chapters);
assertThirtyPerChapter(class8MathematicsQuestions, Object.keys(chapters));
