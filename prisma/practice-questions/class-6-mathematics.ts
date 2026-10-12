import { buildSchoolChapterBank } from "./school-question-bank";
import { assertThirtyPerChapter, cbsePyq, type PracticeQuestionSeed } from "./types";

const q = cbsePyq.bind(null, "class-6", "mathematics");
void q;

const chapters = {
  "knowing-our-numbers": ["large numbers", "place value", "estimation", "Roman numerals", "comparison", "operations"],
  "whole-numbers": ["whole numbers", "number line", "successor and predecessor", "properties of addition", "properties of multiplication", "patterns"],
  "playing-with-numbers": ["factors", "multiples", "prime numbers", "composite numbers", "divisibility tests", "HCF and LCM"],
  "basic-geometrical-ideas": ["points lines and rays", "line segments", "curves", "angles", "polygons", "circles"],
  "understanding-elementary-shapes": ["angles", "triangles", "quadrilaterals", "polygons", "three-dimensional shapes", "symmetry"],
  integers: ["positive integers", "negative integers", "number line", "addition", "subtraction", "applications"],
  fractions: ["proper fractions", "improper fractions", "equivalent fractions", "comparison", "addition", "subtraction"],
  decimals: ["decimal notation", "place value", "comparison", "addition", "subtraction", "applications"],
  "data-handling": ["data collection", "pictographs", "bar graphs", "frequency", "interpretation", "organising data"],
  mensuration: ["perimeter", "area", "rectangle", "square", "units", "applications"],
  algebra: ["variables", "constants", "expressions", "patterns", "equations", "use of letters"],
  "ratio-and-proportion": ["ratios", "equivalent ratios", "proportion", "unitary method", "comparison", "applications"],
  symmetry: ["line symmetry", "mirror reflection", "symmetrical figures", "regular shapes", "patterns", "symmetry lines"],
  "practical-geometry": ["construction tools", "line segments", "circles", "perpendiculars", "angles", "geometrical constructions"],
} as const;

export const class6MathematicsQuestions: PracticeQuestionSeed[] = buildSchoolChapterBank("class-6", "mathematics", chapters);
assertThirtyPerChapter(class6MathematicsQuestions, Object.keys(chapters));
