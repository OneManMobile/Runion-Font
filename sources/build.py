"""Build Runion Basic.

    sources/glyphs.txt ─► sources/RunionBasic-Regular.ufo ─ fontmake ─► fonts/ttf/*.ttf ─► fonts/webfonts/*.woff2
                                                                                      └─► specimen/data.js (playground)

glyphs.txt is the real source: dots and the lines between them. The UFO is generated from it
on every build so the font can be compiled — and reviewed — with the standard fontmake tooling.
"""
import json
import subprocess
import sys
import time
from pathlib import Path

from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables.ttProgram import Program
from ufoLib2 import Font

from runion import Params, contours, outline, parse, uses_full_width

SRC = Path(__file__).parent
ROOT = SRC.parent
FAMILY, STYLE, VERSION = "Runion Basic", "Regular", (1, 0)
REPO = "https://github.com/OneManMobile/Runion-Font"
DESIGNER = "Andreas Rudolph"
COPYRIGHT = f"Copyright 2026 The {FAMILY} Project Authors ({REPO})"
LICENSE = ("This Font Software is licensed under the SIL Open Font License, Version 1.1. "
           "This license is available with a FAQ at: https://openfontlicense.org")
LICENSE_URL = "https://openfontlicense.org"
DESCRIPTION = ("A monospaced rune face: the Elder Futhark rebuilt on a grid of 3 by 7 dots. "
               "Straight lines only, dot to dot. Capitals are the same runes traced with a heavier line.")
NUDGE = 10                            # combining marks are drawn this much low; their anchor lifts them back, so
                                      # shapers see a real attachment and non-shaping apps are off by 1% of an em
ASCENT, DESCENT = 1030, -270          # room for the attic and cellar marks; win metrics follow the real bbox
P = Params()
STEM = f"{FAMILY.replace(' ', '')}-{STYLE}"


def features(glyphs, cmap, data):
    """OpenType features: contractions (liga), sound-runes (ss01), mark attachment, GDEF classes."""
    names = [g.name for g in glyphs]
    cap_of = {cmap[ord(c)]: cmap[ord(c.upper())] for c in map(chr, cmap)
              if c.upper() != c and len(c.upper()) == 1 and ord(c.upper()) in cmap and cmap[ord(c.upper())] != cmap[ord(c)]}
    both = lambda n: f"[{n} {cap_of[n]}]" if n in cap_of else n

    def rules(kind):                  # a contraction takes the case of its first letter:  th tH → þ   Th TH → heavy þ
        out = []
        for g in glyphs:
            for lig in getattr(g, kind):
                first, *rest = (cmap[ord(c)] for c in lig)
                tail = " ".join(both(n) for n in rest)
                out.append(f"    sub {first} {tail} by {g.name};")
                if first in cap_of and g.name in cap_of:
                    out.append(f"    sub {cap_of[first]} {tail} by {cap_of[g.name]};")
                    next(d for d in data if d["name"] == cap_of[g.name])[kind].append("".join(lig).capitalize())
        return out

    subs, opt = rules("ligatures"), rules("optional")
    fea = ("languagesystem DFLT dflt;\nlanguagesystem latn dflt;\nlanguagesystem runr dflt;\n"
           "feature liga {\n" + "\n".join(subs) + "\n} liga;\n")
    if opt:
        fea += 'feature ss01 {\n    featureNames { name "Nordic sound-runes"; };\n' + "\n".join(opt) + "\n} ss01;\n"

    # combining marks: every rune fills the same box, so ONE anchor above and ONE below serve all bases
    top = [g.name for g in glyphs if g.mark and max(y for s in g.strokes for _, y in s) > P.rows - 1]
    bottom = [g.name for g in glyphs if g.mark and g.name not in top]
    ligs = [g.name for g in glyphs if (g.ligatures or g.name.removesuffix(".cap") in
                                       {x.name for x in glyphs if x.ligatures}) and g.strokes]
    bases = [g.name for g in glyphs if not g.mark and g.strokes and g.name not in ligs and g.name != ".notdef"]
    mid, hi, lo = P.advance // 2, P.cap + 60, -60
    fea += (f"markClass [{' '.join(top)}] <anchor {mid - P.advance} {hi - NUDGE}> @TOP;\n"
            f"markClass [{' '.join(bottom)}] <anchor {mid - P.advance} {lo - NUDGE}> @BOTTOM;\n"
            f"feature mark {{\n    pos base [{' '.join(bases + ligs)}] <anchor {mid} {hi}> mark @TOP <anchor {mid} {lo}> mark @BOTTOM;\n}} mark;\n"
            f"table GDEF {{\n    GlyphClassDef [{' '.join(bases)}], [{' '.join(ligs)}], [{' '.join(top + bottom)}], ;\n"
            + "".join(f"    LigatureCaretByPos {n} {mid};\n" for n in ligs) + "} GDEF;\n")
    return fea, len(subs), len(opt)


def main():
    glyphs = parse(SRC / "glyphs.txt", P)
    names = [g.name for g in glyphs]
    assert names[0] == ".notdef" and len(set(names)) == len(names), "duplicate glyph name"

    ufo, cmap, data, ys = Font(), {}, [], []
    for g in glyphs:
        for c in g.chars:
            assert ord(c) not in cmap, f"{c!r} mapped twice ({cmap.get(ord(c))}, {g.name})"
            cmap[ord(c)] = g.name
        rings = contours(outline(g, P), clockwise=False)
        if g.mark:                                         # zero-width: the ink sits back over the glyph before it
            rings = [[(x - P.advance, y - NUDGE) for x, y in r] for r in rings]
        ys += [y for r in rings for _, y in r]
        glyph = ufo.newGlyph(g.name)
        glyph.width = 0 if g.mark else P.advance
        glyph.unicodes = [ord(c) for c in g.chars]
        pen = glyph.getPen()
        for ring in rings:
            pen.moveTo(ring[0])
            for pt in ring[1:]:
                pen.lineTo(pt)
            pen.closePath()
        data.append({
            "name": g.name, "chars": g.chars, "cap": g.cap, "mark": g.mark,
            "ligatures": ["".join(l) for l in g.ligatures], "optional": ["".join(l) for l in g.optional],
            "strokes": g.strokes, "fullWidth": uses_full_width(g, P),
            "path": " ".join("M" + " L".join(f"{x} {y}" for x, y in r) + " Z" for r in rings),
        })

    ufo.features.text, n_subs, n_opt = features(glyphs, cmap, data)
    ufo.lib["public.glyphOrder"] = names
    ufo.lib["public.openTypeMeta"] = {"dlng": ["Latn", "Runr"], "slng": ["Latn", "Runr"]}
    i = ufo.info
    i.familyName, i.styleName, i.versionMajor, i.versionMinor = FAMILY, STYLE, *VERSION
    i.unitsPerEm, i.ascender, i.descender, i.capHeight, i.xHeight, i.italicAngle = P.upm, ASCENT, DESCENT, P.cap, P.cap, 0
    i.copyright, i.openTypeNameDesigner, i.openTypeNameDesignerURL = COPYRIGHT, DESIGNER, REPO
    i.openTypeNameManufacturer, i.openTypeNameManufacturerURL = DESIGNER, REPO
    i.openTypeNameLicense, i.openTypeNameLicenseURL, i.openTypeNameDescription = LICENSE, LICENSE_URL, DESCRIPTION
    i.openTypeHheaAscender, i.openTypeHheaDescender, i.openTypeHheaLineGap = ASCENT, DESCENT, 0
    i.openTypeOS2TypoAscender, i.openTypeOS2TypoDescender, i.openTypeOS2TypoLineGap = ASCENT, DESCENT, 0
    i.openTypeOS2WinAscent, i.openTypeOS2WinDescent = max(ys + [ASCENT]), -min(ys + [DESCENT])
    i.openTypeOS2Selection, i.openTypeOS2Type, i.openTypeOS2VendorID = [7], [], "NONE"
    i.openTypeOS2Panose = [2, 0, 5, 9, 0, 0, 0, 0, 0, 0]
    i.openTypeOS2WeightClass, i.openTypeOS2WidthClass = 400, 5
    i.postscriptIsFixedPitch, i.postscriptUnderlinePosition, i.postscriptUnderlineThickness = True, -100, int(P.stroke)

    ufo_path = SRC / f"{STEM}.ufo"
    ufo.save(ufo_path, overwrite=True)
    run = subprocess.run([sys.executable, "-m", "fontmake", "-u", str(ufo_path), "-o", "ttf", "--keep-overlaps",
                          "--no-production-names", "--output-dir", str(ROOT / "fonts/ttf")], capture_output=True, text=True)
    if run.returncode:
        sys.exit(run.stdout + run.stderr)

    ttf = ROOT / "fonts/ttf" / f"{STEM}.ttf"               # unhinted: same fix-ups as `gftools fix-nonhinting`
    font = TTFont(ttf)
    font["gasp"] = gasp = newTable("gasp")
    gasp.gaspRange = {0xFFFF: 15}
    font["prep"] = prep = newTable("prep")
    prep.program = Program()
    prep.program.fromAssembly(["PUSHW[]", "511", "SCANCTRL[]", "PUSHB[]", "4", "SCANTYPE[]"])
    font["head"].flags |= 1 << 3
    font.save(ttf)
    font.flavor = "woff2"
    (ROOT / "fonts/webfonts").mkdir(parents=True, exist_ok=True)
    font.save(ROOT / "fonts/webfonts" / f"{STEM}.woff2")

    params = {k: getattr(P, k) for k in ("cols", "rows", "cell_w", "cell_h", "stroke", "cap_stroke", "side", "advance", "cap")}
    (ROOT / "specimen").mkdir(exist_ok=True)
    (ROOT / "specimen/data.js").write_text(
        "window.RUNION = " + json.dumps({"built": int(time.time()), "params": params, "glyphs": data}, ensure_ascii=False) + ";\n",
        encoding="utf-8")

    for line in (SRC / "glyphs.txt").read_text().splitlines():     # coverage of every required character set
        if line.startswith("@charset"):
            want = [int(t[2:], 16) for t in (SRC / line.split()[1]).read_text().split() if t.startswith("U+")]
            miss = [cp for cp in want if cp not in cmap]
            print(f"{line.split()[1]}: {len(want) - len(miss)}/{len(want)}" + (" · missing " + " ".join(f"U+{cp:04X}" for cp in miss) if miss else " ✓"))
    narrow = [g.name for g in glyphs if g.strokes and not g.mark and not g.name.startswith("uni") and not uses_full_width(g, P)]
    print(f"{len(names)} glyphs · {len(cmap)} characters · {n_subs} contractions + {n_opt} optional (ss01)")
    print(f"advance {P.advance} · cap height {P.cap} · stroke {P.stroke:g} · capitals {P.cap_stroke:g} · ink y {min(ys)}…{max(ys)}")
    print(f"not full width ({len(narrow)}): {' '.join(narrow)}")
    print(f"→ {ttf.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
