import { buildSchoolChapterBank } from "./school-question-bank";
import { assertThirtyPerChapter, cbsePyq, type PracticeQuestionSeed } from "./types";

const q = cbsePyq.bind(null, "class-9", "science");
void q;

const chapters = {
  "matter-in-our-surroundings": ["particle nature of matter", "states of matter", "diffusion", "change of state", "latent heat", "temperature conversion"],
  "is-matter-around-us-pure": ["mixtures and pure substances", "solutions", "suspensions", "colloids", "separation techniques", "physical and chemical changes"],
  "atoms-and-molecules": ["laws of chemical combination", "atomic mass", "molecular mass", "mole concept", "chemical formulae", "valency"],
  "structure-of-the-atom": ["electrons protons and neutrons", "atomic number", "mass number", "isotopes", "isobars", "electronic configuration"],
  "the-fundamental-unit-of-life": ["cell theory", "cell membrane", "cell organelles", "nucleus and chromosomes", "plant and animal cells", "osmosis"],
  tissues: ["plant tissues", "meristematic tissue", "permanent tissue", "animal epithelial tissue", "connective tissue", "muscular and nervous tissue"],
  motion: ["distance and displacement", "speed and velocity", "acceleration", "distance-time graphs", "velocity-time graphs", "uniform circular motion"],
  "force-and-laws-of-motion": ["force and inertia", "Newton's first law", "Newton's second law", "Newton's third law", "momentum", "conservation of momentum"],
  gravitation: ["universal gravitation", "free fall", "mass and weight", "thrust and pressure", "buoyancy", "relative density"],
  "work-and-energy": ["work done by a force", "kinetic energy", "potential energy", "law of conservation of energy", "power", "commercial unit of energy"],
  sound: ["production of sound", "sound propagation", "amplitude frequency and time period", "loudness and pitch", "audible range", "echo and reverberation"],
  "improvement-in-food-resources": ["crop variety improvement", "manure and fertilisers", "irrigation", "crop protection", "animal husbandry", "sustainable food production"],
} as const;

export const class9ScienceQuestions: PracticeQuestionSeed[] = buildSchoolChapterBank("class-9", "science", chapters);

assertThirtyPerChapter(class9ScienceQuestions, Object.keys(chapters));
