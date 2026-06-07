#!/usr/bin/env python3
"""Generate icon PNGs matching the rail's .gnr-sparkle glyph.

Renders the two-path SVG (article frame + 4-pointed sparkle) in white on a
Gemini gradient circle (linear-gradient 135deg: #9168c0 -> #5684d1 -> #1ba1e3).
Uses only Python stdlib (struct + zlib). 2x2 supersampling smooths the edges
at favicon sizes.
"""
import struct
import zlib
from math import hypot
from pathlib import Path

OUT = Path(__file__).parent

# SVG content occupies this fraction of the circle diameter.
CONTENT_RATIO = 0.80

PURPLE = (0x91, 0x68, 0xC0)
BLUE = (0x56, 0x84, 0xD1)
CYAN = (0x1B, 0xA1, 0xE3)


def _chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def write_png(path: Path, size: int, pixel):
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            r, g, b, a = pixel(x, y, size)
            raw += bytes((r, g, b, a))
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    path.write_bytes(sig + _chunk(b"IHDR", ihdr) + _chunk(b"IDAT", idat) + _chunk(b"IEND", b""))


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def gradient(t):
    t = max(0.0, min(1.0, t))
    if t < 0.5:
        return lerp(PURPLE, BLUE, t * 2)
    return lerp(BLUE, CYAN, (t - 0.5) * 2)


def in_rounded_rect(vx, vy, x1, y1, x2, y2, radius):
    if not (x1 <= vx <= x2 and y1 <= vy <= y2):
        return False
    for cx, cy, sx, sy in (
        (x1 + radius, y1 + radius, -1, -1),
        (x2 - radius, y1 + radius, 1, -1),
        (x1 + radius, y2 - radius, -1, 1),
        (x2 - radius, y2 - radius, 1, 1),
    ):
        if sx * (vx - cx) > 0 and sy * (vy - cy) > 0:
            return hypot(vx - cx, vy - cy) <= radius
    return True


def in_frame(vx, vy):
    # Path 2: rounded rect (3,3)-(21,21) radius 2 with hollow interior (5,5)-(19,19)
    # plus a bottom-right corner "gap" so the sparkle peeks out at (13,13)-(21,21).
    if not in_rounded_rect(vx, vy, 3.0, 3.0, 21.0, 21.0, 2.0):
        return False
    if 5.0 <= vx <= 19.0 and 5.0 <= vy <= 19.0:
        return False
    if vx >= 13.0 and vy >= 13.0:
        return False
    return True


def in_text_bars(vx, vy):
    # Three white "text lines" inside the frame.
    if 7.0 <= vx <= 17.0 and 7.0 <= vy <= 9.0:
        return True
    if 7.0 <= vx <= 17.0 and 11.0 <= vy <= 13.0:
        return True
    if 7.0 <= vx <= 13.0 and 15.0 <= vy <= 17.0:
        return True
    return False


def in_sparkle(vx, vy):
    # Path 1: 4-pointed star at (18.5, 18.5) with concave sides.
    # Astroid-style equation (dx/r)^p + (dy/r)^p <= 1 with p < 1.
    cx, cy = 18.5, 18.5
    r = 4.5
    dx = abs(vx - cx)
    dy = abs(vy - cy)
    if dx > r or dy > r:
        return False
    return (dx / r) ** 0.62 + (dy / r) ** 0.62 <= 1.0


def in_glyph(vx, vy):
    return in_frame(vx, vy) or in_text_bars(vx, vy) or in_sparkle(vx, vy)


def sample(px, py, size):
    cx = cy = size / 2.0
    r = size / 2.0
    if hypot(px - cx, py - cy) > r:
        return (0, 0, 0, 0)

    content_size = size * CONTENT_RATIO
    pad = (size - content_size) / 2.0
    unit = content_size / 24.0
    vx = (px - pad) / unit
    vy = (py - pad) / unit

    if 0.0 <= vx <= 24.0 and 0.0 <= vy <= 24.0 and in_glyph(vx, vy):
        return (255, 255, 255, 255)

    # 135deg gradient: starts at top-left (#9168c0), ends at bottom-right (#1ba1e3).
    t = (px + py) / (2.0 * size)
    r_, g_, b_ = gradient(t)
    return (r_, g_, b_, 255)


def pixel(x, y, size):
    # 2x2 supersample with premultiplied-alpha averaging for clean edges.
    acc_pr = acc_pg = acc_pb = 0.0
    acc_a = 0.0
    offsets = ((0.25, 0.25), (0.25, 0.75), (0.75, 0.25), (0.75, 0.75))
    for ox, oy in offsets:
        r, g, b, a = sample(x + ox, y + oy, size)
        af = a / 255.0
        acc_pr += r * af
        acc_pg += g * af
        acc_pb += b * af
        acc_a += a
    n = len(offsets)
    out_a = acc_a / n
    if out_a < 0.5:
        return (0, 0, 0, 0)
    af_out = out_a / 255.0
    return (
        max(0, min(255, int(round((acc_pr / n) / af_out)))),
        max(0, min(255, int(round((acc_pg / n) / af_out)))),
        max(0, min(255, int(round((acc_pb / n) / af_out)))),
        max(0, min(255, int(round(out_a)))),
    )


for s in (16, 48, 128):
    write_png(OUT / f"icon-{s}.png", s, pixel)
    print(f"wrote icon-{s}.png")
