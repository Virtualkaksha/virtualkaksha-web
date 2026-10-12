import { buildSchoolChapterBank } from "./school-question-bank";
import { assertThirtyPerChapter, cbsePyq, type PracticeQuestionSeed } from "./types";

const q = cbsePyq.bind(null, "class-8", "science");
void q;

const chapters = {
  "crop-production-and-management": ["agricultural practices", "preparation of soil", "sowing", "manure and fertilisers", "irrigation", "storage of grains"],
  "microorganisms-friend-and-foe": ["useful microorganisms", "harmful microorganisms", "food preservation", "nitrogen fixation", "antibiotics", "communicable diseases"],
  "coal-and-petroleum": ["fossil fuels", "coal products", "petroleum refining", "natural gas", "exhaustible resources", "conservation of fuels"],
  "combustion-and-flame": ["combustion", "types of combustion", "ignition temperature", "flammable substances", "flame zones", "fuel efficiency"],
  "conservation-of-plants-and-animals": ["deforestation", "wildlife sanctuaries", "national parks", "biosphere reserves", "endemic species", "reforestation"],
  "reproduction-in-animals": ["sexual reproduction", "male reproductive system", "female reproductive system", "fertilisation", "development of embryo", "asexual reproduction"],
  "reaching-the-age-of-adolescence": ["adolescence", "puberty", "hormones", "endocrine glands", "secondary sexual characters", "balanced diet"],
  "force-and-pressure": ["contact forces", "non-contact forces", "pressure", "pressure in liquids", "atmospheric pressure", "applications of pressure"],
  friction: ["causes of friction", "factors affecting friction", "fluid friction", "increasing friction", "reducing friction", "friction in daily life"],
  sound: ["vibrations", "sound propagation", "amplitude and loudness", "frequency and pitch", "noise pollution", "human ear"],
  "chemical-effects-of-electric-current": ["conducting liquids", "electroplating", "electrodes", "chemical changes", "tester circuits", "applications of electroplating"],
  "some-natural-phenomena": ["electric charges", "lightning", "lightning safety", "earthquakes", "seismic waves", "earthquake preparedness"],
  light: ["reflection of light", "laws of reflection", "multiple reflection", "human eye", "care of eyes", "dispersion of light"],
} as const;

export const class8ScienceQuestions: PracticeQuestionSeed[] = buildSchoolChapterBank("class-8", "science", chapters);
assertThirtyPerChapter(class8ScienceQuestions, Object.keys(chapters));
