#!/usr/bin/env python3
"""
Compose public/assets/manhattan-browse-map.svg from per-neighborhood SVG exports.

Piece files typically use their own viewBox (cropped export). They are not in the
same coordinate system as the 569×1491 browse canvas until placed. This script:

  1. Maps each filename stem → `data-region` (PIECE_TO_REGION).
  2. Aligns each piece using union bbox → target bbox from tools/data/
     manhattan-region-ref-bboxes.json (scaled from tools/map-editor.html polygons).
  3. Splits dark fills (#000, #0D0D0D, …) into the label layer; colored fills become
     mh-boro-chroma (L-shapes stay accurate per file).

Then run:
  python3 tools/generate-manhattan-hit-layer.py

Optional layout JSON (--layout): { "WH": {"dx": 2, "dy": -1}, "CP": {"cx": 280, "cy": 900} }
Stems match filenames without .svg. Use --merge-reference-svg only with a known-good
combined map if you want SVG bboxes to override the JSON.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REFERENCE_SVG = ROOT / "public" / "assets" / "manhattan-browse-map.svg"
DEFAULT_REF_BBOXES_JSON = ROOT / "tools" / "data" / "manhattan-region-ref-bboxes.json"
DEFAULT_OUT = ROOT / "public" / "assets" / "manhattan-browse-map.svg"

# Abbreviation / export name -> browse region key, or None for non-interactive decorative fill.
PIECE_TO_REGION: dict[str, str | None] = {
    "WH": "inwood-heights",
    "HH": "inwood-heights",
    "UES": "upper-east",
    "Yv": "upper-east",
    "UWS": "upper-west",
    "EH": "harlem-east",
    "Sh": "harlem-east",
    "H": "harlem-east",
    "MH": "harlem-west",
    "MH-1": "harlem-west",
    "CP": None,
    "HK": "hells-kitchen",
    "LC": "midtown-west",
    "CC": "midtown-west",
    "GD": "midtown-west",
    "TD": "times-square",
    "M": "midtown-east",
    "KB": "murray-hill",
    "C": "chelsea",
    "G": "flatiron-gramercy",
    "EV": "east-village",
    "LES": "lower-east",
    "Tb": "tribeca-civic",
    "Ct": "chinatown-civic",
    "FD": "financial-west",
    "GV": "east-village",
    "WV": "soho-nolita",
}

PAPER_FILLS = frozenset({"#f5e9dc", "#F5E9DC"})
INK_FILLS = frozenset({"#000", "#000000", "black"})


def is_dark_ink(fill: str) -> bool:
    """Treat near-black hex fills as label ink (e.g. #0D0D0D), not neighborhood chroma."""
    f = fill.strip().lower()
    if f in {x.lower() for x in INK_FILLS}:
        return True
    if not f.startswith("#"):
        return False
    h = f[1:]
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6:
        return False
    try:
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    except ValueError:
        return False
    return r + g + b < 160


def local_tag(tag: str) -> str:
    return tag.split("}")[-1] if "}" in tag else tag


def parse_fill(el: ET.Element) -> str:
    return (el.get("fill") or "").strip()


def is_chroma_shape(el: ET.Element) -> bool:
    if local_tag(el.tag) not in ("rect", "path", "polygon", "polyline"):
        return False
    f = parse_fill(el).lower()
    if not f or f == "none":
        return False
    if f in {x.lower() for x in PAPER_FILLS}:
        return False
    if is_dark_ink(f):
        return False
    if f.startswith("url("):
        return True
    return True


def path_bbox(d: str) -> tuple[float, float, float, float]:
    nums = re.findall(r"[-+]?(?:\d*\.?\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?", d)
    vals = [float(x) for x in nums]
    if len(vals) < 2:
        return (0.0, 0.0, 0.0, 0.0)
    xs = vals[0::2]
    ys = vals[1::2]
    if not xs or not ys:
        return (0.0, 0.0, 0.0, 0.0)
    return (min(xs), min(ys), max(xs), max(ys))


def element_bbox(el: ET.Element) -> tuple[float, float, float, float] | None:
    t = local_tag(el.tag)
    if t == "rect":
        try:
            x = float(el.get("x") or 0)
            y = float(el.get("y") or 0)
            w = float(el.get("width") or 0)
            h = float(el.get("height") or 0)
        except ValueError:
            return None
        return (x, y, x + w, y + h)
    if t == "path":
        d = el.get("d")
        if not d:
            return None
        return path_bbox(d)
    if t in ("polygon", "polyline"):
        pts = el.get("points", "")
        pairs = re.findall(
            r"([-+]?(?:\d*\.?\d+|\d+\.?\d*))\s*[, ]\s*([-+]?(?:\d*\.?\d+|\d+\.?\d*))",
            pts,
        )
        if not pairs:
            return None
        xs = [float(a) for a, _ in pairs]
        ys = [float(b) for _, b in pairs]
        return (min(xs), min(ys), max(xs), max(ys))
    return None


def union_bboxes(boxes: list[tuple[float, float, float, float]]) -> tuple[float, float, float, float]:
    return (
        min(b[0] for b in boxes),
        min(b[1] for b in boxes),
        max(b[2] for b in boxes),
        max(b[3] for b in boxes),
    )


def bbox_center(b: tuple[float, float, float, float]) -> tuple[float, float]:
    return ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)


def parse_reference_region_bboxes(ref_path: Path) -> dict[str, tuple[float, float, float, float]]:
    text = ref_path.read_text(encoding="utf-8")
    start = text.find('<g class="mh-chroma-layer"')
    if start == -1:
        raise SystemExit("reference: mh-chroma-layer not found")
    pos = text.find(">", start) + 1
    depth = 1
    i = pos
    while i < len(text) and depth:
        if text.startswith("<g ", i) or text.startswith("<g>", i):
            depth += 1
            i = text.find(">", i) + 1
            continue
        if text.startswith("</g>", i):
            depth -= 1
            i += 4
            continue
        i += 1
    inner = text[pos : i - 4]
    by_region: dict[str, list[tuple[float, float, float, float]]] = defaultdict(list)
    for m in re.finditer(r"<rect\b([^>]*)/>", inner):
        attrs = m.group(1)
        if "mh-boro-chroma" not in attrs or "data-region=" not in attrs:
            continue
        rm = re.search(r'data-region="([^"]+)"', attrs)
        if not rm:
            continue
        key = rm.group(1)
        try:
            xm = re.search(r'\bx="([^"]+)"', attrs)
            ym = re.search(r'\by="([^"]+)"', attrs)
            wm = re.search(r'\bwidth="([^"]+)"', attrs)
            hm = re.search(r'\bheight="([^"]+)"', attrs)
            if not all([xm, ym, wm, hm]):
                continue
            x, y, w, h = float(xm.group(1)), float(ym.group(1)), float(wm.group(1)), float(hm.group(1))
        except ValueError:
            continue
        by_region[key].append((x, y, x + w, y + h))
    for m in re.finditer(r"<path\b([^>]*)/>", inner):
        attrs = m.group(1)
        if "mh-boro-chroma" not in attrs or "data-region=" not in attrs:
            continue
        rm = re.search(r'data-region="([^"]+)"', attrs)
        dm = re.search(r'd="([^"]+)"', attrs)
        if not rm or not dm:
            continue
        key = rm.group(1)
        bb = path_bbox(dm.group(1))
        by_region[key].append(bb)
    out: dict[str, tuple[float, float, float, float]] = {}
    for k, lst in by_region.items():
        if lst:
            out[k] = union_bboxes(lst)
    return out


def load_ref_bboxes(json_path: Path, svg_path: Path | None) -> dict[str, tuple[float, float, float, float]]:
    raw = json.loads(json_path.read_text(encoding="utf-8"))
    out: dict[str, tuple[float, float, float, float]] = {}
    for k, v in raw.items():
        if not isinstance(v, list) or len(v) != 4:
            continue
        out[k] = (float(v[0]), float(v[1]), float(v[2]), float(v[3]))
    if svg_path and svg_path.is_file():
        try:
            from_svg = parse_reference_region_bboxes(svg_path)
            out.update(from_svg)
        except SystemExit:
            pass
    return out


def collect_piece_layers(
    piece_path: Path,
) -> tuple[list[ET.Element], list[ET.Element]]:
    tree = ET.parse(piece_path)
    root = tree.getroot()
    if local_tag(root.tag) != "svg":
        raise ValueError(f"expected root <svg> in {piece_path}")
    chroma: list[ET.Element] = []
    labels: list[ET.Element] = []
    for el in root.iter():
        if el is root:
            continue
        if not is_chroma_shape(el):
            if local_tag(el.tag) in ("path", "rect") and parse_fill(el):
                labels.append(el)
            continue
        chroma.append(el)
    return chroma, labels


def clone_for_output(el: ET.Element) -> ET.Element:
    """Deep copy without parent."""
    return ET.fromstring(ET.tostring(el, encoding="unicode"))


def set_chroma_attrs(el: ET.Element, region_key: str | None) -> None:
    if region_key:
        cur = el.get("class") or ""
        parts = cur.split()
        if "mh-boro-chroma" not in parts:
            parts.append("mh-boro-chroma")
        el.set("class", " ".join(p for p in parts if p))
        el.set("data-region", region_key)
    else:
        cur = el.get("class") or ""
        parts = [p for p in cur.split() if p and p != "mh-boro-chroma"]
        parts.append("mh-park-fill")
        el.set("class", " ".join(parts))
        if "data-region" in el.attrib:
            del el.attrib["data-region"]


def format_element(el: ET.Element) -> str:
    s = ET.tostring(el, encoding="unicode", default_namespace=None)
    s = s.replace("ns0:", "").replace(' xmlns:ns0="http://www.w3.org/2000/svg"', "")
    s = re.sub(r'\s+xmlns="http://www.w3.org/2000/svg"', "", s, count=1)
    return s


def target_centers_for_region(
    ref_bb: tuple[float, float, float, float], n: int, piece_bbs: list[tuple[float, float, float, float]]
) -> list[tuple[float, float]]:
    if n == 1:
        return [bbox_center(ref_bb)]
    x0, y0, x1, y1 = ref_bb
    rw, rh = x1 - x0, y1 - y0
    # Sort pieces along long axis of reference bbox; place targets in equal slots on that axis.
    use_vertical = rh >= rw
    indexed = list(enumerate(piece_bbs))
    if use_vertical:
        indexed.sort(key=lambda t: bbox_center(t[1])[1])
        centers = []
        for i in range(n):
            t = y0 + (i + 0.5) * (rh / n)
            centers.append(((x0 + x1) / 2, t))
    else:
        indexed.sort(key=lambda t: bbox_center(t[1])[0])
        centers = []
        for i in range(n):
            t = x0 + (i + 0.5) * (rw / n)
            centers.append((t, (y0 + y1) / 2))
    # Map sorted order back to original file order: assign by sorted piece index order
    order = [i for i, _ in indexed]
    out_map: dict[int, tuple[float, float]] = {}
    for slot, idx in enumerate(order):
        out_map[idx] = centers[slot]
    return [out_map[i] for i in range(n)]


def layout_nudge(stem: str, layout: dict) -> tuple[float, float]:
    if stem not in layout:
        return (0.0, 0.0)
    o = layout[stem]
    return (float(o.get("dx", 0)), float(o.get("dy", 0)))


def decorative_target_center(
    stem: str, layout: dict, ref_bbs: dict[str, tuple[float, float, float, float]]
) -> tuple[float, float]:
    """Central Park / non-filter art: optional JSON { \"CP\": { \"cx\": 280, \"cy\": 920 } }."""
    if stem in layout and "cx" in layout[stem] and "cy" in layout[stem]:
        return (float(layout[stem]["cx"]), float(layout[stem]["cy"]))
    park = ref_bbs.get("_central-park")
    if park:
        return bbox_center(park)
    uw = ref_bbs.get("upper-west")
    ue = ref_bbs.get("upper-east")
    if uw and ue:
        return ((bbox_center(uw)[0] + bbox_center(ue)[0]) / 2, (uw[1] + ue[3]) / 2 + 180)
    return (284.5, 900.0)


def main() -> None:
    ap = argparse.ArgumentParser(description="Build manhattan-browse-map.svg from piece SVGs.")
    ap.add_argument(
        "--pieces-dir",
        type=Path,
        required=True,
        help="Folder of per-neighborhood .svg files (e.g. ~/Downloads/Map).",
    )
    ap.add_argument(
        "--ref-bboxes",
        type=Path,
        default=DEFAULT_REF_BBOXES_JSON,
        help="JSON of region keys to [x0,y0,x1,y1] (see tools/data/manhattan-region-ref-bboxes.json).",
    )
    ap.add_argument(
        "--merge-reference-svg",
        type=Path,
        default=None,
        help="Optional SVG whose mh-chroma-layer bboxes override JSON (use a known-good map, not the output file).",
    )
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Output SVG path.")
    ap.add_argument(
        "--layout",
        type=Path,
        default=None,
        help='Optional JSON: {"WH":{"dx":0,"dy":0},"CP":{"cx":280,"cy":900}}',
    )
    args = ap.parse_args()

    pieces_dir: Path = args.pieces_dir.expanduser().resolve()
    if not pieces_dir.is_dir():
        raise SystemExit(f"not a directory: {pieces_dir}")

    if not args.ref_bboxes.is_file():
        raise SystemExit(f"missing --ref-bboxes file: {args.ref_bboxes}")
    ref_bbs = load_ref_bboxes(args.ref_bboxes, args.merge_reference_svg)
    layout: dict = {}
    if args.layout and args.layout.is_file():
        layout = json.loads(args.layout.read_text(encoding="utf-8"))

    svg_files = sorted(pieces_dir.glob("*.svg"), key=lambda p: p.name.lower())
    if not svg_files:
        raise SystemExit(f"no .svg files in {pieces_dir}")

    groups: dict[str | None, list[Path]] = defaultdict(list)
    unknown: list[Path] = []
    for p in svg_files:
        stem = p.stem
        if stem not in PIECE_TO_REGION:
            unknown.append(p)
            continue
        groups[PIECE_TO_REGION[stem]].append(p)

    if unknown:
        print(
            "Warning: no PIECE_TO_REGION entry for stems (skipped):",
            ", ".join(x.stem for x in unknown),
            file=sys.stderr,
        )

    chroma_parts: list[str] = []
    label_parts: list[str] = []

    for region_key, paths in sorted(groups.items(), key=lambda x: (x[0] is None, str(x[0]))):
        if region_key is None:
            for p in paths:
                chroma_elts, lab_elts = collect_piece_layers(p)
                if not chroma_elts:
                    print(f"Warning: no chroma shapes in decorative {p.name}", file=sys.stderr)
                ub = union_bboxes([b for e in chroma_elts if (b := element_bbox(e))]) if chroma_elts else (
                    0.0,
                    0.0,
                    1.0,
                    1.0,
                )
                tcx, tcy = decorative_target_center(p.stem, layout, ref_bbs)
                pcx, pcy = bbox_center(ub)
                tx, ty = tcx - pcx, tcy - pcy
                ndx, ndy = layout_nudge(p.stem, layout)
                tx, ty = tx + ndx, ty + ndy
                trans = f"translate({tx:.4f} {ty:.4f})"
                for el in chroma_elts:
                    c = clone_for_output(el)
                    set_chroma_attrs(c, None)
                    prev = c.get("transform")
                    c.set("transform", f"{trans} {prev}".strip() if prev else trans)
                    chroma_parts.append(format_element(c))
                for el in lab_elts:
                    c = clone_for_output(el)
                    prev = c.get("transform")
                    c.set("transform", f"{trans} {prev}".strip() if prev else trans)
                    label_parts.append(format_element(c))
            continue

        ref_bb = ref_bbs.get(region_key)
        if not ref_bb:
            print(
                f"Warning: no reference bbox for region {region_key!r} — using placeholder.",
                file=sys.stderr,
            )
            ref_bb = (0.0, 0.0, 50.0, 50.0)

        piece_bbs: list[tuple[float, float, float, float]] = []
        file_chroma: list[list[ET.Element]] = []
        for p in paths:
            chroma_elts, _ = collect_piece_layers(p)
            if not chroma_elts:
                print(f"Warning: no chroma shapes in {p.name}", file=sys.stderr)
                piece_bbs.append((0.0, 0.0, 1.0, 1.0))
                file_chroma.append([])
                continue
            bbs = [b for e in chroma_elts if (b := element_bbox(e))]
            piece_bbs.append(union_bboxes(bbs) if bbs else (0.0, 0.0, 1.0, 1.0))
            file_chroma.append(chroma_elts)

        targets = target_centers_for_region(ref_bb, len(paths), piece_bbs)

        for idx, p in enumerate(paths):
            ub = piece_bbs[idx]
            tcx, tcy = targets[idx]
            pcx, pcy = bbox_center(ub)
            tx, ty = tcx - pcx, tcy - pcy
            ndx, ndy = layout_nudge(p.stem, layout)
            tx, ty = tx + ndx, ty + ndy
            trans = f"translate({tx:.4f} {ty:.4f})"
            for el in file_chroma[idx]:
                c = clone_for_output(el)
                set_chroma_attrs(c, region_key)
                prev = c.get("transform")
                c.set("transform", f"{trans} {prev}".strip() if prev else trans)
                chroma_parts.append(format_element(c))

            _, lab_elts = collect_piece_layers(p)
            for el in lab_elts:
                c = clone_for_output(el)
                prev = c.get("transform")
                c.set("transform", f"{trans} {prev}".strip() if prev else trans)
                label_parts.append(format_element(c))

    chroma_inner = "".join(chroma_parts)
    labels_block = (
        f'<g class="mh-map-labels" pointer-events="none" aria-hidden="true">{"".join(label_parts)}</g>'
        if label_parts
        else ""
    )

    out_svg = (
        '<svg width="569" height="1491" viewBox="0 0 569 1491" fill="none" '
        'xmlns="http://www.w3.org/2000/svg">\n'
        '<rect width="569" height="1491" fill="#F5E9DC" class="mh-map-bg" pointer-events="none"/>'
        f'<g class="mh-chroma-layer" pointer-events="none" aria-hidden="true">{chroma_inner}</g>'
        f"{labels_block}\n"
        "</svg>\n"
    )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(out_svg, encoding="utf-8")
    print(f"wrote {args.out} ({len(chroma_parts)} chroma elements, {len(label_parts)} label elements)")


if __name__ == "__main__":
    main()
