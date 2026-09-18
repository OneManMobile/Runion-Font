# Runion Basic

**The Elder Futhark, rebuilt on a grid of 3 × 7 dots.** Straight lines only, dot to dot. Monospace, narrow and tall — and every letter fills the full width of its cell.

![Runion Basic specimen](documentation/specimen.png)

Type ordinary text and get runes: `f` is ᚠ fehu, `u` is ᚢ uruz, and typing `th` contracts into the single rune ᚦ thurisaz, exactly as a rune carver would have written it. CAPITALS are the very same runes traced with a heavier line. The real Unicode runes (ᚠᚢᚦᚨᚱᚲ…) are mapped to the same shapes.

- **Try it:** open [`index.html`](index.html) (or run `make serve`) for a playground with a type tester, every character, and a dot-to-dot sketchpad.
- **Get it:** [`fonts/ttf/RunionBasic-Regular.ttf`](fonts/ttf/RunionBasic-Regular.ttf) · [`fonts/webfonts/RunionBasic-Regular.woff2`](fonts/webfonts/RunionBasic-Regular.woff2)
- **Licence:** [SIL Open Font License 1.1](OFL.txt) — free to use, embed, modify and redistribute.

## The system

![Construction on the dot grid](documentation/grid.png)

The whole font lives on one grid: **3 columns × 7 rows of dots**. A glyph is nothing but a list of connections between dots, and that list is its entire definition. Fehu is `00-06 04-26 02-24`: a stave from bottom-left to top-left, and two arms.

| Rule | What it means |
| --- | --- |
| Dot to dot | Every line starts and ends on a grid dot. No curves, anywhere. |
| Full width | Every letter and digit must touch both the left and the right column. |
| One stroke | One line thickness for everything (`@stroke` in the source). |
| The nib | At a dot, ink never leaves that dot's square "nib". Corners are mitred but clipped, terminals are cut flush with the grid — so every glyph lands in exactly the same ink box. |
| Capitals | Never drawn. An uppercase letter reuses the same dots and lines with a heavier pen (`@cap_stroke`). The dots do not move, so stems line up across cases. |
| Marks | Accents live outside the rune: two rows above, two below. Because every rune fills the same box, one mark position fits them all, and the ~140 accented letters are composed automatically from Unicode — rune + mark. |

Everything is defined in one readable text file, [`sources/glyphs.txt`](sources/glyphs.txt).

## Historical ties

![The 24 runes of the Elder Futhark](documentation/futhark.png)

The **Elder Futhark** is the oldest form of the runic alphabets: 24 runes, used by Germanic peoples from roughly the 2nd to the 8th century. It is named after its first six runes — *f, u, þ, a, r, k*. Runes were cut into wood, bone, metal and stone, which is why they are made of staves and slanted branches: straight cuts, no curves. That constraint is the whole idea behind this typeface.

Some of the artefacts behind the shapes:

- **The Kylver Stone** (Gotland, Sweden, c. 400) carries the earliest known complete listing of the rune row in order.
- **The Vadstena bracteate** (Sweden, c. 500) lists the row divided into three groups of eight, the *ættir*.
- **The Golden Horns of Gallehus** (Denmark, c. 400) bore one of the most famous Elder Futhark inscriptions: *ek hlewagastiz holtijaz horna tawido* — "I, Hlewagastiz Holtijaz, made the horn". The originals were stolen and melted down in 1802.
- **Codex Runicus** (c. 1300) is a law book — the Scanian Law — written entirely in medieval runes, proof that runes lived on as a full writing system long after the Viking Age.

Later rune rows fill the gaps the Elder Futhark leaves for modern text. The **Younger Futhark** reduced the row to 16 runes; the **medieval runes** then grew again, adding *stung* (dotted) runes until every Latin letter had a counterpart; the **Anglo-Saxon futhorc** added runes of its own.

### What is faithful, and what is not

All 24 runes keep their historical structure and orientation (checked against reference glyphs of the Unicode Runic block). Where Runion departs from the carved forms, it is because of the narrow grid or the full-width rule:

| Glyph | Status |
| --- | --- |
| ᛁ isa (`i`) | A bare stave cannot fill the width, so it carries top and bottom bars. The plain stave survives as `\|`. |
| ᚲ kaunan, ᛃ jera, ᛜ ingwaz | Historically small, floating runes; here stretched to full height. |
| ᛒ berkanan | Two symmetric 45° bowls would need nine rows; the bowls are steep outside, shallow inside. ᚹ wunjo and ᚱ raido share that bowl. |
| ᛞ dagaz | The corner-to-corner cross clogs at this width; a smaller 45° cross joins the staves. |
| ᛊ sowilo (`s`) | The three-stroke form. The older four-stroke Σ form lives on as `ß`. |
| `th`, `ng` | Contract to ᚦ and ᛜ, the single runes these sounds always had. |
| `c`, `æ`, `ø`, `ð` | Borrowed from later rows: Anglo-Saxon cen ᚳ, and the medieval Scandinavian ᛅ (æ), ᚯ (ø) and ᚧ (ð — dotted in the original, barred here). |
| `å`, `q`, `v`, `x`, digits, symbols, accents | Modern inventions that follow the same grid rules. Runes never had them. |
| `y` | Uses ᛇ eihwaz, the yew rune, whose historical sound value is debated. |

Runion is a typeface, not a scholarly reconstruction: a modern reading of an old constraint.

## Using the font

```css
@font-face {
  font-family: "Runion Basic";
  src: url("RunionBasic-Regular.woff2") format("woff2");
}
.runes { font-family: "Runion Basic", monospace; }
```

| Feature | Default | Effect |
| --- | --- | --- |
| `liga` | on | Contractions: `th` → ᚦ, `ng` → ᛜ, `aa` → å. A contraction takes the case of its first letter. Turn off with `font-variant-ligatures: none`. |
| `ss01` | off | Nordic sound-runes: `ae` → æ, `oe` → ø, and ä ö ü become the æ, ø and y runes, the way medieval carvers wrote those sounds. Turn on with `font-feature-settings: "ss01"`. |
| `mark` | on | Combining accents attach to any rune. |

Character support: the complete **Google Fonts Latin Core** set (319 characters), plus the Elder Futhark in the Unicode Runic block.

## Building

```bash
make venv     # once: Python environment with fontmake, ufoLib2, shapely, pillow
make build    # glyphs.txt → UFO → fonts/ttf, fonts/webfonts, playground data
make proof    # contact sheet (out/) and documentation images
make test     # fontbakery, Google Fonts profile
```

`sources/glyphs.txt` is the real source. `sources/build.py` turns it into `sources/RunionBasic-Regular.ufo` and compiles that with **fontmake**, so the font can be built and reviewed with standard tooling. `sources/runion.py` is the small engine that turns dots and lines into outlines.

To change a glyph, edit its line in `glyphs.txt` (the playground's sketchpad writes the code for you) and run `make build`.

## Licence

Copyright 2026 The Runion Basic Project Authors (https://github.com/OneManMobile/Runion-Font).

This Font Software is licensed under the SIL Open Font License, Version 1.1. The licence is in [`OFL.txt`](OFL.txt) and is also available with a FAQ at https://openfontlicense.org.
