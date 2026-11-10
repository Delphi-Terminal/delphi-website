#!/usr/bin/env python3
"""Neighbors-only Castle-style halftone, locked to the crisp USA SVG frame.

Albers framing is fitted so Natural Earth CONUS matches the SVG outline bbox.
USA is punched using the actual SVG path so the white overlay covers it fully.
No plaid/grid. Effect fades with distance from the USA.
"""

from __future__ import annotations

import math
import re
from pathlib import Path

import numpy as np
import shapefile
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SHP = Path("/tmp/ne_110m/ne_110m_admin_0_countries.shp")
OUT = ROOT / "public" / "na-halftone.png"
INDEX = ROOT / "index.html"

SVG_W, SVG_H = 960, 600
PAD_L, PAD_T, PAD_R, PAD_B = 520, 220, 160, 180
IMG_W = SVG_W + PAD_L + PAD_R
IMG_H = SVG_H + PAD_T + PAD_B
SCALE = 2
CELL = 5

# Fitted so NE CONUS bbox == SVG outline bbox (anisotropic Albers)
ALBERS_SX = 1232.750761553293
ALBERS_SY = 1246.5834321318862
ALBERS_TX = 459.617675460845
ALBERS_TY = 310.6187472565464

OCEAN = np.array([198, 204, 228], dtype=np.float32)
OCEAN_DEEP = np.array([176, 184, 214], dtype=np.float32)
LAND = np.array([228, 228, 224], dtype=np.float32)
LAND_SHADE = np.array([198, 198, 194], dtype=np.float32)

SKIP = {"United States of America", "United States"}


def albers_unit(lon: float, lat: float) -> tuple[float, float]:
    lam = math.radians(lon + 98.0)
    phi = math.radians(lat)
    phi0, phi1, phi2 = map(math.radians, (38.0, 29.5, 45.5))
    n = (math.sin(phi1) + math.sin(phi2)) / 2.0
    c = math.cos(phi1) ** 2 + 2.0 * n * math.sin(phi1)
    rho0 = math.sqrt(c - 2.0 * n * math.sin(phi0)) / n
    rho = math.sqrt(max(c - 2.0 * n * math.sin(phi), 0.0)) / n
    th = n * lam
    x = rho * math.sin(th)
    y = -(rho0 - rho * math.cos(th))
    return x, y


def albers_svg(lon: float, lat: float) -> tuple[float, float]:
    ux, uy = albers_unit(lon, lat)
    return ALBERS_SX * ux + ALBERS_TX, ALBERS_SY * uy + ALBERS_TY


def svg_to_px(x: float, y: float) -> tuple[float, float]:
    return (x + PAD_L) * SCALE, (y + PAD_T) * SCALE


def project(lon: float, lat: float) -> tuple[float, float]:
    return svg_to_px(*albers_svg(lon, lat))


def field_name_index(sf: shapefile.Reader) -> int:
    names = [f[0] for f in sf.fields[1:]]
    for preferred in ("ADMIN", "NAME", "NAME_EN", "NAME_LONG"):
        if preferred in names:
            return names.index(preferred)
    return 0


def load_svg_outline_pts() -> list[tuple[float, float]]:
    html = INDEX.read_text()
    m = re.search(r'class="us-outline"[^>]*\sd="([^"]+)"', html)
    if not m:
        raise RuntimeError("us-outline path not found in index.html")
    nums = [float(x) for x in re.findall(r"-?\d+\.?\d*", m.group(1))]
    return list(zip(nums[0::2], nums[1::2]))


def build_layers(w: int, h: int) -> tuple[Image.Image, Image.Image]:
    ys = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    xs = np.linspace(0, 1, w, dtype=np.float32)[None, :]

    t = np.clip(
        0.22 * (1.0 - xs) ** 1.1
        + 0.12 * np.abs(ys - 0.45)
        + 0.07 * np.sin(xs * 18 + ys * 9)
        + 0.05 * np.sin(xs * 7 - ys * 11),
        0.0,
        1.0,
    )[..., None]
    ocean_rgb = OCEAN * (1.0 - t) + OCEAN_DEEP * t

    land = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(land)
    sf = shapefile.Reader(str(SHP))
    name_idx = field_name_index(sf)

    for sr in sf.iterShapeRecords():
        name = str(sr.record[name_idx])
        if name in SKIP:
            continue
        shape = sr.shape
        idxs = list(shape.parts) + [len(shape.points)]
        for a, b in zip(idxs, idxs[1:]):
            part = shape.points[a:b]
            if len(part) < 3:
                continue
            pts = [project(lon, lat) for lon, lat in part]
            xs_p = [p[0] for p in pts]
            ys_p = [p[1] for p in pts]
            if max(xs_p) < -80 or min(xs_p) > w + 80 or max(ys_p) < -80 or min(ys_p) > h + 80:
                continue
            draw.polygon(pts, fill=170)

    land = land.filter(ImageFilter.GaussianBlur(radius=0.8))
    land_arr = np.asarray(land, dtype=np.float32)
    mask = (land_arr > 0)[..., None]

    shade = np.clip(
        0.4
        + 0.22 * np.sin(xs * 14) * np.cos(ys * 11)
        + 0.16 * np.sin((xs + ys) * 9),
        0.0,
        1.0,
    )[..., None]
    land_rgb = LAND * (1.0 - shade) + LAND_SHADE * shade

    rgb = np.where(mask, land_rgb, ocean_rgb)
    rgb_img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")

    # Land denser; ocean empty — avoids a full-field “plaid” of dots
    lum_land = np.clip(110 + (1.0 - shade[..., 0]) * 16, 95, 145)
    lum_ocean = 255.0
    lum = np.where(land_arr > 0, lum_land, lum_ocean)
    lum_img = Image.fromarray(np.clip(lum, 0, 255).astype(np.uint8), "L")
    return rgb_img, lum_img


def punch_usa_hole(rgb: Image.Image, lum: Image.Image) -> None:
    """Use the crisp SVG outline path so the white fill covers the hole exactly."""
    w, h = rgb.size
    usa = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(usa)
    outline = [svg_to_px(x, y) for x, y in load_svg_outline_pts()]
    draw.polygon(outline, fill=255)
    # Slight expand so seams never peek under the stroke
    usa = usa.filter(ImageFilter.MaxFilter(3))
    usa_arr = np.asarray(usa, dtype=np.float32) / 255.0

    rgb_arr = np.asarray(rgb, dtype=np.float32)
    lum_arr = np.asarray(lum, dtype=np.float32)
    ocean = OCEAN.reshape(1, 1, 3)
    m = usa_arr[..., None]
    rgb_arr = rgb_arr * (1.0 - m) + ocean * m
    lum_arr = lum_arr * (1.0 - usa_arr) + 240.0 * usa_arr

    rgb.paste(Image.fromarray(np.clip(rgb_arr, 0, 255).astype(np.uint8), "RGB"))
    lum.paste(Image.fromarray(np.clip(lum_arr, 0, 255).astype(np.uint8), "L"))


def halftone_dots(src: Image.Image, cell: int) -> Image.Image:
    w, h = src.size
    sw, sh = w // cell, h // cell
    small = np.asarray(src.resize((sw, sh), Image.Resampling.BOX), dtype=np.float32)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(out)
    max_r = cell * 0.48
    for j in range(sh):
        row = small[j]
        for i in range(sw):
            dark = (1.0 - row[i] / 255.0) ** 0.75
            if dark < 0.08:
                continue
            r = max_r * dark
            if r < 0.6:
                continue
            cx = i * cell + cell * 0.5
            cy = j * cell + cell * 0.5
            draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(18, 22, 40, 210))
    return out


def fade_from_usa(img: Image.Image) -> Image.Image:
    w, h = img.size
    cx, cy = svg_to_px(480, 310)
    ys, xs = np.ogrid[0:h, 0:w]
    dx = (xs - cx) / (540.0 * SCALE)
    dy = (ys - cy) / (420.0 * SCALE)
    dist = np.sqrt(dx * dx + dy * dy)
    alpha = np.clip(1.2 - dist * 0.65, 0.0, 1.0) ** 1.4

    rgba = img.convert("RGBA")
    arr = np.asarray(rgba).astype(np.float32)
    ocean = np.array([OCEAN[0], OCEAN[1], OCEAN[2], 255.0], dtype=np.float32)
    out = arr * alpha[..., None] + ocean * (1.0 - alpha[..., None])
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def main() -> None:
    w, h = IMG_W * SCALE, IMG_H * SCALE
    print(f"Building {w}x{h} neighbors layer…")
    rgb, lum = build_layers(w, h)
    print("Punching USA hole from SVG outline…")
    punch_usa_hole(rgb, lum)
    print("Halftoning…")
    composed = Image.alpha_composite(rgb.convert("RGBA"), halftone_dots(lum, CELL))
    print("Fading away from USA…")
    composed = fade_from_usa(composed)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    composed.convert("RGB").save(OUT, optimize=True)
    meta = ROOT / "public" / "na-halftone.json"
    meta.write_text(
        '{"svgW":960,"svgH":600,'
        f'"padL":{PAD_L},"padT":{PAD_T},"padR":{PAD_R},"padB":{PAD_B},'
        f'"imgW":{IMG_W},"imgH":{IMG_H}}}\n'
    )
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
