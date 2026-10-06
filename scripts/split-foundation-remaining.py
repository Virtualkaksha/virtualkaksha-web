"""Split remaining Class VI–IX foundation PDFs onto app catalogue chapters."""

from __future__ import annotations

import json
import re
from pathlib import Path

from PyPDF2 import PdfReader, PdfWriter

ROOT = Path(r"c:\Users\ASUS\Desktop\virtualkaksha-web-main\virtualkaksha-web-main")
PKG = ROOT / "6-10 Foundation Package"
OUT = ROOT / "storage" / "imports" / "foundation-mapped"


def slugify_name(name: str) -> str:
    return (
        name.lower()
        .replace("–", "-")
        .replace("—", "-")
        .replace("'", "")
        .replace("'", "")
    )
    # catalogue uses apostrophe kept then stripped by [^a-z0-9]


def chapter_slug(name: str) -> str:
    value = name.lower().replace("–", "-").replace("—", "-")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def write_range(src: Path, dest: Path, start: int, end: int, label: str) -> dict:
    reader = PdfReader(str(src))
    writer = PdfWriter()
    for i in range(start - 1, end):
        writer.add_page(reader.pages[i])
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("wb") as handle:
        writer.write(handle)
    first = ((PdfReader(str(dest)).pages[0].extract_text() or "")[:140]).replace("\n", " ")
    safe = first.encode("ascii", "replace").decode("ascii")
    print(f"{dest.relative_to(OUT)} pages={end-start+1} {safe}")
    return {
        "classSlug": dest.parts[-3] if False else None,
        "file": str(dest.relative_to(OUT)).replace("\\", "/"),
        "pageCount": end - start + 1,
        "preview": first,
        "label": label,
    }


def copy_whole(src: Path, dest: Path, label: str) -> dict:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(src.read_bytes())
    pages = len(PdfReader(str(dest)).pages)
    first = ((PdfReader(str(dest)).pages[0].extract_text() or "")[:140]).replace("\n", " ")
    safe = first.encode("ascii", "replace").decode("ascii")
    print(f"{dest.relative_to(OUT)} pages={pages} {safe}")
    return {
        "file": str(dest.relative_to(OUT)).replace("\\", "/"),
        "pageCount": pages,
        "preview": first,
        "label": label,
    }


def job(class_slug: str, subject: str, chapter: str, title: str, src: Path, start: int, end: int, filename: str):
    dest = OUT / class_slug / subject / filename
    meta = write_range(src, dest, start, end, title)
    meta.update(
        {
            "classSlug": class_slug,
            "subjectSlug": subject,
            "chapterSlug": chapter,
            "title": f"{title} – Notes",
        }
    )
    return meta


def copy_job(class_slug: str, subject: str, chapter: str, title: str, src: Path, filename: str):
    dest = OUT / class_slug / subject / filename
    meta = copy_whole(src, dest, title)
    meta.update(
        {
            "classSlug": class_slug,
            "subjectSlug": subject,
            "chapterSlug": chapter,
            "title": f"{title} – Notes",
        }
    )
    return meta


def main():
    items: list[dict] = []

    vi = PKG / "Class_VI Study Package-20240408T130124Z-001" / "Class_VI Study Package"
    vii = PKG / "Class_VII Study Package-20240409T010428Z-001" / "Class_VII Study Package"
    viii = PKG / "Class_VIII Study Package-20240409T010525Z-001" / "Class_VIII Study Package"
    ix = PKG / "Class_IX Study Package-20240409T010628Z-001" / "Class_IX Study Package"

    # --- Class 6 Science ---
    bio1 = vi / "BIOLOGY" / "SP_1_Biology.pdf"
    bio2 = vi / "BIOLOGY" / "SP_2_Biology.pdf"
    chem1 = vi / "CHEMISTRY" / "SP_1_Chemistry.pdf"
    chem2 = vi / "CHEMISTRY" / "SP_2_Chemistry.pdf"
    phy1 = vi / "PHYSICS" / "SP_1_Physics.pdf"
    phy2 = vi / "PHYSICS" / "SP_2_Physics.pdf"

    items += [
        job("class-6", "science", "food-where-does-it-come-from", "Food: Where Does it Come From?", bio1, 1, 10, "01-food.pdf"),
        job("class-6", "science", "components-of-food", "Components of Food", bio1, 11, 22, "02-components-of-food.pdf"),
        job("class-6", "science", "getting-to-know-plants", "Getting to Know Plants", bio1, 23, 38, "03-getting-to-know-plants.pdf"),
        job("class-6", "science", "body-movements", "Body Movements", bio2, 1, 8, "04-body-movements.pdf"),  # printed 39-46
        job("class-6", "science", "the-living-organisms-and-their-surroundings", "The Living Organisms and Their Surroundings", bio2, 9, 14, "05-living-organisms.pdf"),  # 47-52
        job("class-6", "science", "garbage-in-garbage-out", "Garbage In, Garbage Out", bio2, 15, 19, "06-garbage.pdf"),  # 53-57
        job("class-6", "science", "fibre-to-fabric", "Fibre to Fabric", chem1, 1, 16, "07-fibre-to-fabric.pdf"),
        job("class-6", "science", "sorting-materials-into-groups", "Sorting Materials into Groups", chem1, 17, 28, "08-sorting-materials.pdf"),
        job("class-6", "science", "separation-of-substances", "Separation of Substances", chem2, 1, 8, "09-separation.pdf"),  # 29-36
        job("class-6", "science", "changes-around-us", "Changes Around Us", chem2, 9, 16, "10-changes-around-us.pdf"),  # 37-44
        job("class-6", "science", "light-shadows-and-reflections", "Light, Shadows and Reflections", phy1, 1, 12, "11-light.pdf"),
        job("class-6", "science", "motion-and-measurement-of-distances", "Motion and Measurement of Distances", phy1, 13, 22, "12-motion.pdf"),
        job("class-6", "science", "electricity-and-circuits", "Electricity and Circuits", phy1, 23, 34, "13-electricity.pdf"),
        job("class-6", "science", "fun-with-magnets", "Fun with Magnets", phy1, 35, 42, "14-magnets.pdf"),
        job("class-6", "science", "air-around-us", "Air Around Us", phy2, 1, 8, "15-air-around-us.pdf"),  # 43-50
    ]

    vi_math = vi / "MATHEMATICS"
    items += [
        copy_job("class-6", "mathematics", "knowing-our-numbers", "Knowing Our Numbers", vi_math / "Chapter_1_Knowing Our Numbers.pdf", "01-knowing-our-numbers.pdf"),
        copy_job("class-6", "mathematics", "whole-numbers", "Whole Numbers", vi_math / "Chapter_2_Whole Numbers_F.pdf", "02-whole-numbers.pdf"),
        copy_job("class-6", "mathematics", "playing-with-numbers", "Playing with Numbers", vi_math / "Chapter_3_Playing With Numbers.pdf", "03-playing-with-numbers.pdf"),
        copy_job("class-6", "mathematics", "basic-geometrical-ideas", "Basic Geometrical Ideas", vi_math / "Chapter_4_Basic Geometrical Ideas.pdf", "04-basic-geometrical-ideas.pdf"),
        copy_job("class-6", "mathematics", "integers", "Integers", vi_math / "Chapter_6_Integers.pdf", "06-integers.pdf"),
        copy_job("class-6", "mathematics", "fractions", "Fractions", vi_math / "Chapter_7_Fractions.pdf", "07-fractions.pdf"),
        copy_job("class-6", "mathematics", "decimals", "Decimals", vi_math / "Chapter_8_Decimals.pdf", "08-decimals.pdf"),
        copy_job("class-6", "mathematics", "data-handling", "Data Handling", vi_math / "Chapter_9_Data Handling.pdf", "09-data-handling.pdf"),
        copy_job("class-6", "mathematics", "mensuration", "Mensuration", vi_math / "Chapter_10_Mensuration.pdf", "10-mensuration.pdf"),
        copy_job("class-6", "mathematics", "algebra", "Algebra", vi_math / "Chapter_11_Algebra.pdf", "11-algebra.pdf"),
        copy_job("class-6", "mathematics", "ratio-and-proportion", "Ratio and Proportion", vi_math / "Chapter_12_Ratio and Proportion.pdf", "12-ratio-and-proportion.pdf"),
    ]

    # --- Class 7 Science ---
    b1 = vii / "BIOLOGY" / "SP_1_Biology.pdf"
    b2 = vii / "BIOLOGY" / "SP_2_Biology.pdf"
    c1 = vii / "CHEMISTRY" / "SP_1_Chemistry.pdf"
    p1 = vii / "PHYSICS" / "SP_1_Physics.pdf"
    p2 = vii / "PHYSICS" / "SP_2_Physics.pdf"
    items += [
        job("class-7", "science", "nutrition-in-plants", "Nutrition in Plants", b1, 1, 12, "01-nutrition-in-plants.pdf"),
        job("class-7", "science", "nutrition-in-animals", "Nutrition in Animals", b1, 13, 28, "02-nutrition-in-animals.pdf"),
        job("class-7", "science", "respiration-in-organisms", "Respiration in Organisms", b2, 11, 20, "03-respiration.pdf"),  # printed 53-62, SP2 starts 43
        job("class-7", "science", "transportation-in-animals-and-plants", "Transportation in Animals and Plants", b2, 21, 36, "04-transportation.pdf"),  # 63-78
        job("class-7", "science", "reproduction-in-plants", "Reproduction in Plants", b2, 37, 52, "05-reproduction-in-plants.pdf"),  # 79-94
        job("class-7", "science", "forests-our-lifeline", "Forests: Our Lifeline", b2, 53, 62, "06-forests.pdf"),  # 95-104
        job("class-7", "science", "acids-bases-and-salts", "Acids, Bases and Salts", c1, 15, 34, "07-acids-bases-and-salts.pdf"),
        job("class-7", "science", "physical-and-chemical-changes", "Physical and Chemical Changes", c1, 35, 40, "08-physical-and-chemical-changes.pdf"),
        job("class-7", "science", "heat", "Heat", p1, 1, 14, "09-heat.pdf"),
        job("class-7", "science", "motion-and-time", "Motion and Time", p1, 25, 36, "10-motion-and-time.pdf"),
        job("class-7", "science", "electric-current-and-its-effects", "Electric Current and its Effects", p1, 37, 52, "11-electric-current.pdf"),
        job("class-7", "science", "light", "Light", p2, 1, 16, "12-light.pdf"),  # printed 53-68
    ]

    vii_math = vii / "MATHEMATICS"
    items += [
        copy_job("class-7", "mathematics", "integers", "Integers", vii_math / "Chapter_1_Integers.pdf", "01-integers.pdf"),
        copy_job("class-7", "mathematics", "fractions-and-decimals", "Fractions and Decimals", vii_math / "Chapter_2_Fractions and Decimals.pdf", "02-fractions-and-decimals.pdf"),
        copy_job("class-7", "mathematics", "data-handling", "Data Handling", vii_math / "Chapter_3_Data Handling.pdf", "03-data-handling.pdf"),
        copy_job("class-7", "mathematics", "simple-equations", "Simple Equations", vii_math / "Chapter_4_Simple Equation.pdf", "04-simple-equations.pdf"),
        copy_job("class-7", "mathematics", "lines-and-angles", "Lines and Angles", vii_math / "Chapter_5_Lines and Angles.pdf", "05-lines-and-angles.pdf"),
        copy_job("class-7", "mathematics", "congruence-of-triangles", "Congruence of Triangles", vii_math / "Chapter_7_Congruence of Triangles.pdf", "07-congruence-of-triangles.pdf"),
        copy_job("class-7", "mathematics", "comparing-quantities", "Comparing Quantities", vii_math / "Chapter_8_Comparing Quantities.pdf", "08-comparing-quantities.pdf"),
        copy_job("class-7", "mathematics", "rational-numbers", "Rational Numbers", vii_math / "Chapter_9_Rational Numbers_F.pdf", "09-rational-numbers.pdf"),
        copy_job("class-7", "mathematics", "perimeter-and-area", "Perimeter and Area", vii_math / "Chapter_10_Perimeter and Area.pdf", "10-perimeter-and-area.pdf"),
        copy_job("class-7", "mathematics", "algebraic-expressions", "Algebraic Expressions", vii_math / "Chapter_11_Algebra_FINAL.pdf", "11-algebraic-expressions.pdf"),
        copy_job("class-7", "mathematics", "exponents-and-powers", "Exponents and Powers", vii_math / "Chapter_12_Laws of Exponents.pdf", "12-exponents-and-powers.pdf"),
        copy_job("class-7", "mathematics", "practical-geometry", "Practical Geometry", vii_math / "Chapter_13_Practical Geometry.pdf", "13-practical-geometry.pdf"),
        copy_job("class-7", "mathematics", "symmetry", "Symmetry", vii_math / "Chapter_14_Symmetry.pdf", "14-symmetry.pdf"),
    ]

    # --- Class 8 Science ---
    b1 = viii / "BIOLOGY" / "SP_1_Biology.pdf"
    b2 = viii / "BIOLOGY" / "SP_2_Biology.pdf"
    c1 = viii / "CHEMISTRY" / "SP_1_Chemistry.pdf"
    c2 = viii / "CHEMISTRY" / "SP_2_Chemistry.pdf"
    p1 = viii / "PHYSICS" / "SP_1_Physics.pdf"
    p2 = viii / "PHYSICS" / "SP_2_Physics.pdf"
    items += [
        job("class-8", "science", "crop-production-and-management", "Crop Production and Management", b1, 1, 24, "01-crop-production.pdf"),
        job("class-8", "science", "microorganisms-friend-and-foe", "Microorganisms: Friend and Foe", b1, 25, 46, "02-microorganisms.pdf"),
        job("class-8", "science", "reproduction-in-animals", "Reproduction in Animals", b2, 1, 26, "03-reproduction-in-animals.pdf"),  # 69-94
        job("class-8", "science", "reaching-the-age-of-adolescence", "Reaching the Age of Adolescence", b2, 27, 44, "04-adolescence.pdf"),  # 95-112
        job("class-8", "science", "conservation-of-plants-and-animals", "Conservation of Plants and Animals", b2, 45, 56, "05-conservation.pdf"),  # 113-124
        job("class-8", "science", "coal-and-petroleum", "Coal and Petroleum", c1, 29, 40, "06-coal-and-petroleum.pdf"),
        job("class-8", "science", "combustion-and-flame", "Combustion and Flame", c2, 1, 12, "07-combustion-and-flame.pdf"),  # 41-52
        job("class-8", "science", "chemical-effects-of-electric-current", "Chemical Effects of Electric Current", c2, 13, 22, "08-chemical-effects.pdf"),  # 53-62
        job("class-8", "science", "force-and-pressure", "Force and Pressure", p1, 1, 32, "09-force-and-pressure.pdf"),
        job("class-8", "science", "friction", "Friction", p1, 33, 50, "10-friction.pdf"),
        job("class-8", "science", "sound", "Sound", p2, 1, 24, "11-sound.pdf"),  # 67-90
        job("class-8", "science", "light", "Light", p2, 25, 52, "12-light.pdf"),  # 91-118
    ]

    m1 = viii / "MATHEMATICS" / "SP_1_Mathematics.pdf"
    m2 = viii / "MATHEMATICS" / "SP_2_Mathematics.pdf"
    items += [
        job("class-8", "mathematics", "rational-numbers", "Rational Numbers", m1, 1, 14, "01-rational-numbers.pdf"),
        job("class-8", "mathematics", "linear-equations-in-one-variable", "Linear Equations in One Variable", m1, 15, 28, "02-linear-equations.pdf"),
        job("class-8", "mathematics", "understanding-quadrilaterals", "Understanding Quadrilaterals", m1, 29, 40, "03-quadrilaterals.pdf"),
        job("class-8", "mathematics", "data-handling", "Data Handling", m1, 49, 60, "04-data-handling.pdf"),
        job("class-8", "mathematics", "squares-and-square-roots", "Squares and Square Roots", m1, 61, 70, "05-squares.pdf"),
        job("class-8", "mathematics", "cubes-and-cube-roots", "Cubes and Cube Roots", m1, 71, 76, "06-cubes.pdf"),
        job("class-8", "mathematics", "comparing-quantities", "Comparing Quantities", m1, 77, 92, "07-comparing-quantities.pdf"),
        job("class-8", "mathematics", "algebraic-expressions-and-identities", "Algebraic Expressions and Identities", m2, 1, 10, "08-algebraic-expressions.pdf"),  # 101-110
        job("class-8", "mathematics", "mensuration", "Mensuration", m2, 19, 34, "09-mensuration.pdf"),  # 119-134
        job("class-8", "mathematics", "exponents-and-powers", "Exponents and Powers", m2, 35, 42, "10-exponents.pdf"),  # 135-142
        job("class-8", "mathematics", "direct-and-inverse-proportions", "Direct and Inverse Proportions", m2, 43, 48, "11-proportions.pdf"),  # 143-148
        job("class-8", "mathematics", "factorisation", "Factorisation", m2, 49, 56, "12-factorisation.pdf"),  # 149-156
        job("class-8", "mathematics", "introduction-to-graphs", "Introduction to Graphs", m2, 57, 62, "13-graphs.pdf"),  # 157-162
    ]

    # --- Class 9 Science ---
    b1 = ix / "BIOLOGY" / "SP_1_Biology.pdf"
    c1 = ix / "CHEMISTRY" / "SP_1_Chemistry.pdf"
    c2 = ix / "CHEMISTRY" / "SP_2_Chemistry.pdf"
    p1 = ix / "PHYSICS" / "SP_1_Physics.pdf"
    p2 = ix / "PHYSICS" / "SP_2_Physics.pdf"
    items += [
        job("class-9", "science", "the-fundamental-unit-of-life", "The Fundamental Unit of Life", b1, 1, 22, "01-cell.pdf"),
        job("class-9", "science", "tissues", "Tissues", b1, 23, 54, "02-tissues.pdf"),
        job("class-9", "science", "improvement-in-food-resources", "Improvement in Food Resources", b1, 55, 72, "03-food-resources.pdf"),
        job("class-9", "science", "matter-in-our-surroundings", "Matter in Our Surroundings", c1, 1, 12, "04-matter.pdf"),
        job("class-9", "science", "is-matter-around-us-pure", "Is Matter Around Us Pure?", c1, 13, 36, "05-pure-matter.pdf"),
        job("class-9", "science", "atoms-and-molecules", "Atoms and Molecules", c2, 1, 12, "06-atoms-and-molecules.pdf"),  # 37-48
        job("class-9", "science", "structure-of-the-atom", "Structure of the Atom", c2, 13, 24, "07-atomic-structure.pdf"),  # 49-60
        job("class-9", "science", "motion", "Motion", p1, 1, 16, "08-motion.pdf"),
        job("class-9", "science", "force-and-laws-of-motion", "Force and Laws of Motion", p1, 17, 30, "09-force.pdf"),
        job("class-9", "science", "gravitation", "Gravitation", p1, 31, 40, "10-gravitation.pdf"),
        job("class-9", "science", "work-and-energy", "Work and Energy", p2, 13, 32, "11-work-and-energy.pdf"),  # 53-72, SP2 starts 41
        job("class-9", "science", "sound", "Sound", p2, 33, 46, "12-sound.pdf"),  # 73-86
    ]

    ixm1 = ix / "MATHEMATICS" / "SP_1_Maths.pdf"
    ixm2 = ix / "MATHEMATICS" / "SP_2_Maths.pdf"
    ixm4 = ix / "MATHEMATICS" / "SP_4_Maths.pdf"
    ixm5 = ix / "MATHEMATICS" / "SP_5_Maths.pdf"
    items += [
        job("class-9", "mathematics", "number-systems", "Number Systems", ixm1, 1, 18, "01-number-systems.pdf"),
        job("class-9", "mathematics", "polynomials", "Polynomials", ixm1, 19, 40, "02-polynomials.pdf"),
        job("class-9", "mathematics", "introduction-to-euclid-s-geometry", "Introduction to Euclid's Geometry", ixm1, 41, 48, "03-euclid.pdf"),
        job("class-9", "mathematics", "lines-and-angles", "Lines and Angles", ixm1, 49, 78, "04-lines-and-angles.pdf"),
        job("class-9", "mathematics", "triangles", "Triangles", ixm1, 79, 98, "05-triangles.pdf"),
        job("class-9", "mathematics", "coordinate-geometry", "Coordinate Geometry", ixm1, 99, 110, "06-coordinate-geometry.pdf"),
        job("class-9", "mathematics", "heron-s-formula", "Heron's Formula", ixm1, 111, 126, "07-herons-formula.pdf"),
        job("class-9", "mathematics", "linear-equations-in-two-variables", "Linear Equations in Two Variables", ixm2, 1, 14, "08-linear-equations.pdf"),  # 147-160
        job("class-9", "mathematics", "quadrilaterals", "Quadrilaterals", ixm2, 15, 38, "09-quadrilaterals.pdf"),  # 161-184
        job("class-9", "mathematics", "circles", "Circles", ixm4, 1, 26, "10-circles.pdf"),  # 211-236
        job("class-9", "mathematics", "surface-areas-and-volumes", "Surface Areas and Volumes", ixm4, 27, 46, "11-surface-areas.pdf"),  # 237-256
        job("class-9", "mathematics", "probability", "Probability", ixm5, 1, 18, "12-probability.pdf"),  # 261-278
        job("class-9", "mathematics", "statistics", "Statistics", ixm5, 19, 44, "13-statistics.pdf"),  # 279-304
    ]

    OUT.mkdir(parents=True, exist_ok=True)
    manifest_path = OUT / "manifest.json"
    clean = [{k: v for k, v in item.items() if k != "preview"} for item in items]
    manifest_path.write_text(json.dumps(clean, indent=2), encoding="utf-8")
    print("items", len(clean), "manifest", manifest_path)


if __name__ == "__main__":
    main()
