import { buildSchoolChapterBank } from "./school-question-bank";
import { assertThirtyPerChapter, cbsePyq, type PracticeQuestionSeed } from "./types";

const q = cbsePyq.bind(null, "class-9", "mathematics");
void q;

const chapters = {
  "number-systems": ["rational and irrational numbers", "real numbers", "decimal expansions", "laws of exponents", "number line representation", "rationalisation"],
  polynomials: ["terms and coefficients", "degree of a polynomial", "zeroes of polynomials", "remainder theorem idea", "factor theorem idea", "algebraic identities"],
  "coordinate-geometry": ["Cartesian plane", "coordinate axes", "origin", "quadrants", "ordered pairs", "plotting points"],
  "linear-equations-in-two-variables": ["linear equations", "solutions as ordered pairs", "graph of a linear equation", "intercepts", "parallel lines", "applications of equations"],
  "introduction-to-euclid-s-geometry": ["definitions", "axioms", "postulates", "Euclid's five postulates", "theorems", "logical reasoning"],
  "lines-and-angles": ["complementary angles", "supplementary angles", "vertically opposite angles", "transversal", "parallel lines", "angle sum properties"],
  triangles: ["congruence criteria", "triangle inequalities", "angle sum property", "exterior angle property", "isosceles triangle property", "medians and altitudes"],
  quadrilaterals: ["angle sum property", "properties of parallelograms", "midpoint theorem", "types of quadrilaterals", "diagonals", "opposite sides and angles"],
  circles: ["circle and its parts", "chords", "arcs", "central angles", "equal chords", "perpendicular from centre to chord"],
  "heron-s-formula": ["semi-perimeter", "Heron's formula", "area of a triangle", "area of quadrilaterals", "units of area", "application problems"],
  "surface-areas-and-volumes": ["cuboid", "cube", "cylinder", "surface area", "volume", "unit conversion"],
  statistics: ["data collection", "frequency distribution", "histogram", "frequency polygon", "bar graph", "interpretation of data"],
  probability: ["experimental probability", "outcomes", "events", "likelihood", "probability scale", "random experiments"],
} as const;

export const class9MathematicsQuestions: PracticeQuestionSeed[] = buildSchoolChapterBank("class-9", "mathematics", chapters);

assertThirtyPerChapter(class9MathematicsQuestions, Object.keys(chapters));
