import { buildSchoolChapterBank } from "./school-question-bank";
import { assertThirtyPerChapter, cbsePyq, type PracticeQuestionSeed } from "./types";

const q = cbsePyq.bind(null, "class-7", "science");
void q;

const chapters = {
  "nutrition-in-plants": ["modes of nutrition", "photosynthesis", "chlorophyll", "parasitic nutrition", "saprotrophic nutrition", "symbiotic relationships"],
  "nutrition-in-animals": ["human digestive system", "ingestion", "digestion", "absorption", "assimilation", "ruminants"],
  heat: ["temperature", "thermometers", "heat transfer", "conduction", "convection", "radiation"],
  "acids-bases-and-salts": ["indicators", "acidic substances", "basic substances", "neutralisation", "natural indicators", "uses of neutralisation"],
  "physical-and-chemical-changes": ["physical changes", "chemical changes", "rusting", "crystallisation", "galvanisation", "chemical equations"],
  "respiration-in-organisms": ["breathing and respiration", "aerobic respiration", "anaerobic respiration", "respiration in plants", "respiration in animals", "breathing rate"],
  "transportation-in-animals-and-plants": ["circulatory system", "blood components", "heart", "excretion", "xylem", "phloem"],
  "reproduction-in-plants": ["modes of reproduction", "vegetative propagation", "spore formation", "pollination", "fertilisation", "seed dispersal"],
  "motion-and-time": ["speed", "time measurement", "distance-time graph", "uniform motion", "non-uniform motion", "oscillatory motion"],
  "electric-current-and-its-effects": ["electric circuits", "heating effect", "fuses", "electromagnets", "electric bell", "safety devices"],
  light: ["rectilinear propagation", "reflection", "plane mirrors", "spherical mirrors", "lenses", "sunlight and colours"],
  "forests-our-lifeline": ["forest ecosystem", "food chains", "decomposers", "soil conservation", "deforestation", "forest products"],
  "wastewater-story": ["wastewater", "sewage treatment", "sanitation", "sludge", "septic tanks", "water conservation"],
} as const;

export const class7ScienceQuestions: PracticeQuestionSeed[] = buildSchoolChapterBank("class-7", "science", chapters);
assertThirtyPerChapter(class7ScienceQuestions, Object.keys(chapters));
