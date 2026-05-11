#!/usr/bin/env python3
"""
Rebuild <g class="mh-hit-layer"> in public/assets/manhattan-browse-map.svg from
mh-chroma-layer geometry (one hit per chroma rect/path).

Run after any change to mh-chroma-layer (Figma SVG export, extra L-shape rects/paths, etc.).
L-shaped filter regions need multiple elements with the same data-region so selection outlines every leg.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SVG_PATH = ROOT / "public" / "assets" / "manhattan-browse-map.svg"


def extract_chroma_inner(svg: str) -> str:
    start = svg.find('<g class="mh-chroma-layer"')
    if start == -1:
        raise SystemExit("mh-chroma-layer not found")
    pos = svg.find(">", start) + 1
    depth = 1
    i = pos
    while i < len(svg) and depth:
        if svg.startswith("<g ", i) or svg.startswith("<g>", i):
            depth += 1
            i = svg.find(">", i) + 1
            continue
        if svg.startswith("</g>", i):
            depth -= 1
            i += 4
            continue
        i += 1
    return svg[pos : i - 4]


def chroma_chunks(inner: str) -> list[str]:
    parts = re.split(r"(?=<(?:rect|path))", inner)
    return [p for p in parts if "mh-boro-chroma" in p]


def key_to_aria_label(key: str) -> str:
    return key.replace("-", " ")


def chunk_to_hit(chunk: str, counts: dict[str, int]) -> str:
    rm = re.search(r'data-region="([^"]+)"', chunk)
    if not rm:
        raise ValueError("missing data-region")
    key = rm.group(1)
    el_id = next_hit_id(key, counts)
    label = key_to_aria_label(key)
    c = chunk.strip()

    if c.startswith("<rect"):
        return rect_hit(c, key, el_id, label)

    if c.startswith("<path"):
        return path_hit(c, key, el_id, label)

    raise ValueError(f"unknown chroma tag: {c[:40]}")


def next_hit_id(key: str, counts: dict[str, int]) -> str:
    counts[key] = counts.get(key, 0) + 1
    n = counts[key]
    return f"mh-region-{key}" if n == 1 else f"mh-region-{key}-{n}"


def rect_hit(chunk: str, key: str, el_id: str, label: str) -> str:
    xm = re.search(r'\bx="([^"]+)"', chunk)
    ym = re.search(r'\by="([^"]+)"', chunk)
    wm = re.search(r'\bwidth="([^"]+)"', chunk)
    hm = re.search(r'\bheight="([^"]+)"', chunk)
    if not wm or not hm:
        raise ValueError(f"rect missing width/height: {chunk[:80]}")
    bits = [
        '<rect fill="none" pointer-events="all"',
        f'x="{xm.group(1) if xm else "0"}"',
        f'y="{ym.group(1) if ym else "0"}"',
        f'width="{wm.group(1)}"',
        f'height="{hm.group(1)}"',
    ]
    return " ".join(hit_bits_with_transform(bits, chunk, key, el_id, label))


def path_hit(chunk: str, key: str, el_id: str, label: str) -> str:
    dm = re.search(r'd="([^"]+)"', chunk)
    if not dm:
        raise ValueError(f"path missing d: {chunk[:80]}")
    bits = [
        '<path fill="none" pointer-events="all"',
        f'd="{dm.group(1)}"',
    ]
    return " ".join(hit_bits_with_transform(bits, chunk, key, el_id, label))


def hit_bits_with_transform(bits: list[str], chunk: str, key: str, el_id: str, label: str) -> list[str]:
    tm = re.search(r'transform="([^"]+)"', chunk)
    if tm:
        bits.append(f'transform="{tm.group(1)}"')
    bits.extend([
        f'id="{el_id}"',
        'class="mh-boro"',
        f'data-region="{key}"',
        'tabindex="0"',
        'role="button"',
        f'aria-label="{label}"/>',
    ])
    return bits


def main() -> None:
    path = output_svg_path()
    svg = path.read_text(encoding="utf-8")
    ordered = ordered_hit_targets(svg)
    hit_block = '<g class="mh-hit-layer" pointer-events="auto">' + "".join(ordered) + "</g>"

    if "</svg>" not in svg:
        raise SystemExit("no closing svg tag")
    old = remove_existing_hit_layers(svg)

    if old.rstrip().endswith("</svg>"):
        new_svg = old.rstrip()[:-6] + hit_block + "\n</svg>"
    else:
        new_svg = old.replace("</svg>", hit_block + "\n</svg>", 1)

    path.write_text(new_svg, encoding="utf-8")
    print(f"wrote {len(ordered)} hit targets to {path}")


def output_svg_path() -> Path:
    if len(sys.argv) > 1:
        return Path(sys.argv[1])
    return SVG_PATH


def ordered_hit_targets(svg: str) -> list[str]:
    chunks = chroma_chunks(extract_chroma_inner(svg))
    counts: dict[str, int] = {}
    hits = [chunk_to_hit(ch, counts) for ch in chunks]
    return hit_targets_with_financial_east_last(hits)


def hit_targets_with_financial_east_last(hits: list[str]) -> list[str]:
    # financial-east path hit last for z-order (legacy stacking fix)
    fe = [h for h in hits if 'data-region="financial-east"' in h]
    rest = [h for h in hits if 'data-region="financial-east"' not in h]
    return rest + fe


def remove_existing_hit_layers(svg: str) -> str:
    old = svg
    while True:
        start = old.find('<g class="mh-hit-layer"')
        if start == -1:
            return old
        end = hit_layer_end(old, start)
        old = old[:start] + old[end:]


def hit_layer_end(svg: str, start: int) -> int:
    depth = 0
    i = start
    while i < len(svg):
        if svg.startswith("<g ", i) or svg.startswith("<g>", i):
            depth += 1
            i = svg.find(">", i) + 1
            continue
        if svg.startswith("</g>", i):
            depth -= 1
            i += 4
            if depth == 0:
                return i
            continue
        i += 1
    raise SystemExit("unclosed mh-hit-layer")


if __name__ == "__main__":
    main()
