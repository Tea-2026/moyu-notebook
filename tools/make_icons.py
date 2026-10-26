"""Generate the Moyu Notebook app icons from one fish source."""
from PIL import Image, ImageDraw, ImageFilter
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "icons")
os.makedirs(OUT, exist_ok=True)

S = 2048
BG = (62, 90, 85)
FG = (244, 239, 224)


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def fish_mask():
    m = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(m)
    scale = S / 32

    def p(x, y):
        return (x * scale, y * scale)

    # tail (behind the body)
    d.polygon([p(12.2, 16), p(5.2, 10.4), p(6.6, 16), p(5.2, 21.6)], fill=255)
    # top fin
    d.polygon([p(16.2, 10.8), p(18.2, 7.2), p(20.4, 10.4)], fill=255)
    # body
    d.ellipse([p(9.2, 10.2)[0], p(9.2, 10.2)[1], p(26.2, 21.8)[0], p(26.2, 21.8)[1]], fill=255)
    # eye
    cx, cy, r = p(22.7, 14.4)[0], p(22.7, 14.4)[1], 0.82 * scale
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=0)
    return m.filter(ImageFilter.GaussianBlur(1.2))


def make_icon(size, padding=0.0):
    mask = rounded_mask(size, int(size * 0.29))
    bg = Image.new("RGBA", (size, size), BG + (255,))
    mark = fish_mask().resize((size, size), Image.Resampling.LANCZOS)
    if padding:
        inner = 1 - 2 * padding
        small = mark.resize((int(size * inner), int(size * inner)), Image.Resampling.LANCZOS)
        canvas = Image.new("L", (size, size), 0)
        canvas.paste(small, (int(size * padding), int(size * padding)))
        mark = canvas
    fg = Image.new("RGBA", (size, size), FG + (255,))
    bg.paste(fg, (0, 0), mark)
    bg.putalpha(mask)
    return bg


def save_png(img, name):
    img.save(os.path.join(OUT, name), "PNG", optimize=True)
    print("wrote", name, img.size)


save_png(make_icon(192), "icon-192.png")
save_png(make_icon(512), "icon-512.png")
save_png(make_icon(180), "apple-touch-icon.png")
save_png(make_icon(512, padding=0.08), "icon-maskable-512.png")
save_png(make_icon(64), "favicon-64.png")

ico_sizes = [16, 24, 32, 48, 64, 128, 256]
make_icon(256).save(os.path.join(OUT, "app.ico"), format="ICO", sizes=[(s, s) for s in ico_sizes])
print("wrote app.ico")

svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="9.4" fill="#3e5a55"/>
  <path d="M12.2 16 5.2 10.4v11.2L12.2 16Z" fill="#f4efe0"/>
  <path d="M16.2 10.8 18.2 7.2l2.2 3.2Z" fill="#f4efe0"/>
  <ellipse cx="17.7" cy="16" rx="8.5" ry="5.8" fill="#f4efe0"/>
  <circle cx="22.7" cy="14.4" r=".82" fill="#3e5a55"/>
</svg>
"""
with open(os.path.join(OUT, "favicon.svg"), "w", encoding="utf-8") as f:
    f.write(svg)
print("wrote favicon.svg")
