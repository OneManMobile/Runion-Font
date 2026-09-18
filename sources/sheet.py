"""Contact sheet: every glyph on its grid → out/sheet.png  (quick visual check)."""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from runion import Params, contours, outline, parse, uses_full_width

SRC = Path(__file__).parent
ROOT = SRC.parent
P = Params()
S = 0.56                      # pixels per font unit (drawn 2× then downsampled)
COLS, PAD, LABEL = 11, 26, 30
INK, PAPER, DOT, FAINT, WARN = (24, 22, 20), (244, 240, 232), (196, 72, 48), (214, 196, 178), (200, 40, 40)
ATTIC, CELLAR = 2, 2                                       # mark rows above and below the rune grid


def draw_glyph(d, g, ox, oy):
    top = oy + (P.cap + ATTIC * P.cell_h) * S
    for ring in contours(outline(g, P)):
        d.polygon([(ox + x * S, top - y * S) for x, y in ring], fill=INK)
    shape = outline(g, P)
    for poly in getattr(shape, "geoms", [shape]):          # punch the holes back out
        for hole in getattr(poly, "interiors", []):
            d.polygon([(ox + x * S, top - y * S) for x, y in hole.coords], fill=PAPER)
    r = 3
    for gx in range(P.cols):
        for gy in range(-CELLAR, P.rows + ATTIC):
            x, y = P.pt(gx, gy)
            d.ellipse([ox + x * S - r, top - y * S - r, ox + x * S + r, top - y * S + r], fill=DOT if 0 <= gy < P.rows else FAINT)


def main(names=None):
    glyphs = [g for g in parse(SRC / "glyphs.txt", P) if g.strokes]
    if names:
        glyphs = [g for g in glyphs if g.name in names]
    tall = P.cap + (ATTIC + CELLAR) * P.cell_h
    cw, ch = P.advance * S + PAD, tall * S + PAD + LABEL
    rows = -(-len(glyphs) // COLS)
    img = Image.new("RGB", (int(COLS * cw + PAD), int(rows * ch + PAD)), PAPER)
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 20)
    except OSError:
        font = ImageFont.load_default()
    for i, g in enumerate(glyphs):
        ox, oy = PAD + (i % COLS) * cw, PAD + (i // COLS) * ch
        draw_glyph(d, g, ox, oy)
        ok = uses_full_width(g, P)
        label = (g.chars[0] if g.chars and g.chars[0].isprintable() and not g.mark else "") + " " + g.name
        d.text((ox, oy + tall * S + 6), label.strip()[:14], fill=INK if ok or g.mark or g.name.startswith("uni") else WARN, font=font)
    out = ROOT / "out"
    out.mkdir(exist_ok=True)
    img = img.resize((img.width // 2, img.height // 2), Image.LANCZOS)
    img.save(out / "sheet.png")
    print(f"{len(glyphs)} glyphs → {out / 'sheet.png'}  {img.size}")


if __name__ == "__main__":
    main(sys.argv[1:])
