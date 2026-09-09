import assert from "node:assert/strict";
import test from "node:test";

import {
  CATALOGUE_TYPE_SLUGS,
  getCatalogueFilterPresentation,
  publicCatalogueTypeHref,
  studentCatalogueTypeHref,
} from "@/lib/resources/catalogue-types";

const types = [
  { slug: CATALOGUE_TYPE_SLUGS.notes, name: "Notes" },
  { slug: CATALOGUE_TYPE_SLUGS.previousYearQuestions, name: "Previous Year Questions" },
];

test("catalogue hrefs pin the seeded previous-year-questions slug", () => {
  assert.equal(publicCatalogueTypeHref(CATALOGUE_TYPE_SLUGS.previousYearQuestions), "/search?type=previous-year-questions");
  assert.equal(
    studentCatalogueTypeHref(CATALOGUE_TYPE_SLUGS.previousYearQuestions),
    "/student/resources/search?type=previous-year-questions",
  );
});

test("previous year papers keep a dedicated section heading even if the stored name differs", () => {
  const presentation = getCatalogueFilterPresentation(CATALOGUE_TYPE_SLUGS.previousYearQuestions, types);
  assert.equal(presentation.heading, "Previous Year Papers");
  assert.match(presentation.description ?? "", /previous year papers/i);
  assert.equal(presentation.emptyTitle, "No previous year papers found");
});

test("unfiltered catalogue search keeps the generic heading", () => {
  const presentation = getCatalogueFilterPresentation("", types);
  assert.equal(presentation.heading, "Search learning resources");
  assert.equal(presentation.emptyTitle, "No resources found");
});
