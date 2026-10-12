import assert from "node:assert/strict";
import test from "node:test";

import { publicCataloguePath, publicPageSeo, publicSeoCopy } from "../lib/seo/public-listing";

test("public catalogue paths and titles are unique per chapter", () => {
  assert.equal(publicCataloguePath({ level: "class-10", subject: "mathematics", chapter: "real-numbers" }), "/cbse/class-10/mathematics/real-numbers");
  const chapter = publicSeoCopy({ level: "class-10", subject: "mathematics", chapterName: "Real Numbers" });
  assert.match(chapter.title, /Class 10 Maths Real Numbers/);
  assert.match(chapter.description, /CBSE Class 10 Maths/);
  const seo = publicPageSeo({ level: "class-12", subject: "physics", chapter: "electric-charges-and-fields" });
  assert.equal(seo.canonical, "/cbse/class-12/physics/electric-charges-and-fields");
  assert.match(seo.title, /Electric Charges and Fields/);
});
