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
    counts[key] = counts.get(key, 0) + 1
    n = counts[key]
    el_id = f"mh-region-{key}" if n == 1 else f"mh-region-{key}-{n}"
    label = key_to_aria_label(key)
    c = chunk.strip()

    if c.startswith("<rect"):
        xm = re.search(r'\bx="([^"]+)"', c)
        ym = re.search(r'\by="([^"]+)"', c)
        wm = re.search(r'\bwidth="([^"]+)"', c)
        hm = re.search(r'\bheight="([^"]+)"', c)
        tm = re.search(r'transform="([^"]+)"', c)
        if not wm or not hm:
            raise ValueError(f"rect missing width/height: {c[:80]}")
        bits = [
            '<rect fill="none" pointer-events="all"',
            f'x="{xm.group(1) if xm else "0"}"',
            f'y="{ym.group(1) if ym else "0"}"',
            f'width="{wm.group(1)}"',
            f'height="{hm.group(1)}"',
        ]
        if tm:
            bits.append(f'transform="{tm.group(1)}"')
        bits.extend(
            [
                f'id="{el_id}"',
                'class="mh-boro"',
                f'data-region="{key}"',
                'tabindex="0"',
                'role="button"',
                f'aria-label="{label}"/>',
            ]
        )
        return " ".join(bits)

    if c.startswith("<path"):
        dm = re.search(r'd="([^"]+)"', c)
        tm = re.search(r'transform="([^"]+)"', c)
        if not dm:
            raise ValueError(f"path missing d: {c[:80]}")
        bits = [
            '<path fill="none" pointer-events="all"',
            f'd="{dm.group(1)}"',
        ]
        if tm:
            bits.append(f'transform="{tm.group(1)}"')
        bits.extend(
            [
                f'id="{el_id}"',
                'class="mh-boro"',
                f'data-region="{key}"',
                'tabindex="0"',
                'role="button"',
                f'aria-label="{label}"/>',
            ]
        )
        return " ".join(bits)

    raise ValueError(f"unknown chroma tag: {c[:40]}")


def main() -> None:
    path = SVG_PATH
    if len(sys.argv) > 1:
        path = Path(sys.argv[1])
    svg = path.read_text(encoding="utf-8")
    inner = extract_chroma_inner(svg)
    chunks = chroma_chunks(inner)
    counts: dict[str, int] = {}
    hits = [chunk_to_hit(ch, counts) for ch in chunks]
    # financial-east path hit last for z-order (legacy stacking fix)
    fe = [h for h in hits if 'data-region="financial-east"' in h]
    rest = [h for h in hits if 'data-region="financial-east"' not in h]
    ordered = rest + fe
    hit_block = '<g class="mh-hit-layer" pointer-events="auto">' + "".join(ordered) + "</g>"

    if "</svg>" not in svg:
        raise SystemExit("no closing svg tag")
    # remove existing hit layer if present
    old = svg
    while True:
        start = old.find('<g class="mh-hit-layer"')
        if start == -1:
            break
        pos = start
        depth = 0
        i = pos
        while i < len(old):
            if old.startswith("<g ", i) or old.startswith("<g>", i):
                depth += 1
                i = old.find(">", i) + 1
                continue
            if old.startswith("</g>", i):
                depth -= 1
                i += 4
                if depth == 0:
                    old = old[:start] + old[i:]
                    break
                continue
            i += 1
        else:
            raise SystemExit("unclosed mh-hit-layer")

    if old.rstrip().endswith("</svg>"):
        new_svg = old.rstrip()[:-6] + hit_block + "\n</svg>"
    else:
        new_svg = old.replace("</svg>", hit_block + "\n</svg>", 1)

    path.write_text(new_svg, encoding="utf-8")
    print(f"wrote {len(ordered)} hit targets to {path}")


if __name__ == "__main__":
    main()
