from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SCALE = 4


def scaled(points):
    return [(x * SCALE, y * SCALE) for x, y in points]


def admin_badge() -> Image.Image:
    size = 512 * SCALE
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shield = scaled([(392, 300), (416, 313), (440, 321), (462, 325), (462, 380), (456, 408), (442, 433), (421, 448), (392, 455), (363, 448), (342, 433), (328, 408), (322, 380), (322, 325), (344, 321), (368, 313)])
    shadow_draw.polygon(shield, fill=(7, 17, 31, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(8 * SCALE))

    badge = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    badge.alpha_composite(shadow, (0, 8 * SCALE))
    draw = ImageDraw.Draw(badge)
    draw.polygon(shield, fill="#07111f", outline="#0b8f63", width=10 * SCALE)
    draw.ellipse((372 * SCALE, 347 * SCALE, 412 * SCALE, 387 * SCALE), fill="white")
    draw.polygon(scaled([(383, 380), (401, 380), (408, 422), (376, 422)]), fill="white")
    return badge.resize((512, 512), Image.Resampling.LANCZOS)


def compose(source: str, output: str) -> None:
    base = Image.open(PUBLIC / source).convert("RGBA").resize((512, 512), Image.Resampling.LANCZOS)
    base.alpha_composite(admin_badge())
    base.quantize(
        colors=256,
        method=Image.Quantize.FASTOCTREE,
        dither=Image.Dither.FLOYDSTEINBERG,
    ).save(PUBLIC / output, optimize=True)


compose("icon-512.png", "admin-icon-512.png")
compose("icon-maskable-512.png", "admin-icon-maskable-512.png")
Image.open(PUBLIC / "admin-icon-512.png").convert("RGBA").resize(
    (192, 192), Image.Resampling.LANCZOS
).quantize(
    colors=256,
    method=Image.Quantize.FASTOCTREE,
    dither=Image.Dither.FLOYDSTEINBERG,
).save(PUBLIC / "admin-icon-192.png", optimize=True)
