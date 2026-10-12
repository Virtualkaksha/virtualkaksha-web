import { buildSchoolChapterBank } from "./school-question-bank";
import { assertThirtyPerChapter, cbsePyq, type PracticeQuestionSeed } from "./types";

const q = cbsePyq.bind(null, "class-6", "science");
void q;

const chapters = {
  "food-where-does-it-come-from": ["food sources", "plant products", "animal products", "ingredients", "edible plant parts", "food habits"],
  "components-of-food": ["nutrients", "carbohydrates", "proteins", "fats", "vitamins and minerals", "balanced diet"],
  "fibre-to-fabric": ["fibres", "cotton", "jute", "spinning", "weaving", "fabric production"],
  "sorting-materials-into-groups": ["material properties", "appearance", "hardness", "solubility", "floating and sinking", "transparency"],
  "separation-of-substances": ["handpicking", "threshing", "winnowing", "sieving", "filtration", "evaporation"],
  "changes-around-us": ["reversible changes", "irreversible changes", "heating and cooling", "expansion", "contraction", "physical changes"],
  "getting-to-know-plants": ["herbs shrubs and trees", "root systems", "stem functions", "leaf venation", "flowers", "plant parts"],
  "body-movements": ["human skeleton", "joints", "muscles", "locomotion", "gait of animals", "body support"],
  "the-living-organisms-and-their-surroundings": ["habitats", "adaptations", "biotic components", "abiotic components", "terrestrial habitats", "aquatic habitats"],
  "motion-and-measurement-of-distances": ["measurement", "standard units", "length", "motion", "types of motion", "measuring instruments"],
  "light-shadows-and-reflections": ["luminous objects", "transparent materials", "shadows", "pinhole camera", "reflection", "mirrors"],
  "electricity-and-circuits": ["electric cells", "circuits", "conductors", "insulators", "switches", "electric safety"],
  "fun-with-magnets": ["magnetic materials", "magnetic poles", "attraction and repulsion", "compass", "finding directions", "care of magnets"],
  water: ["water cycle", "evaporation", "condensation", "groundwater", "water conservation", "rainwater harvesting"],
  "air-around-us": ["composition of air", "oxygen", "carbon dioxide", "water vapour", "air in living organisms", "importance of air"],
  "garbage-in-garbage-out": ["waste management", "biodegradable waste", "non-biodegradable waste", "composting", "recycling", "vermicomposting"],
} as const;

export const class6ScienceQuestions: PracticeQuestionSeed[] = buildSchoolChapterBank("class-6", "science", chapters);
assertThirtyPerChapter(class6ScienceQuestions, Object.keys(chapters));
