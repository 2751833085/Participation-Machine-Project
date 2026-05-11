#!/usr/bin/env python3
"""Rewrite session.js: merge let-state into `st` and prefix identifiers (string-safe)."""
from __future__ import annotations

import re
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "public/js/pages/create-map/session.js"
text = path.read_text(encoding="utf-8")

old_block = """  let selected = null;
  let selectedSource = null;
  let selectRadiusCircle = null;
  let checkpointCenterMarker = null;
  let playerMarker = null;
  let placementActive = false;
  let photoObjectUrl = null;
  /** Last place chosen from area suggestions (for distance checks). */
  let lastAreaPick = null;
  let areaSearchTimer = null;
  let toolbarSearchTimer = null;
  let areaBlurTimer = null;
  /** True while flyTo selection runs — avoids centerPinAboveSheet calling map.stop() mid-flight. */
  let selectionFlyActive = false;
  /** Last Manhattan GPS from “Use my location” — drives chip order + optional “You are here” marker. */
  let lastPlayerLatLng = null;

  let map = null;
  let searchLayer = null;
  let suggestLayer = null;
  let playerLayer = null;"""

new_block = """  const st = {
    selected: null,
    selectedSource: null,
    selectRadiusCircle: null,
    checkpointCenterMarker: null,
    playerMarker: null,
    placementActive: false,
    photoObjectUrl: null,
    lastAreaPick: null,
    areaSearchTimer: null,
    toolbarSearchTimer: null,
    areaBlurTimer: null,
    selectionFlyActive: false,
    lastPlayerLatLng: null,
    map: null,
    searchLayer: null,
    suggestLayer: null,
    playerLayer: null,
  };"""

if old_block not in text:
    raise SystemExit("expected let-block not found")
text = text.replace(old_block, new_block, 1)

KEYS = [
    "selectedSource",
    "selectRadiusCircle",
    "checkpointCenterMarker",
    "playerMarker",
    "placementActive",
    "photoObjectUrl",
    "lastAreaPick",
    "areaSearchTimer",
    "toolbarSearchTimer",
    "areaBlurTimer",
    "selectionFlyActive",
    "lastPlayerLatLng",
    "searchLayer",
    "suggestLayer",
    "playerLayer",
    "selected",
    "map",
]


def replace_idents(src: str, key: str) -> str:
    out: list[str] = []
    i = 0
    n = len(src)
    key_len = len(key)

    while i < n:
        ch = src[i]
        if ch in ("'", '"', "`"):
            quote = ch
            out.append(ch)
            i += 1
            while i < n:
                c = src[i]
                out.append(c)
                if c == "\\" and i + 1 < n:
                    out.append(src[i + 1])
                    i += 2
                    continue
                if c == quote and not (quote == "`" and src[i - 1 : i + 2] == "${"):
                    i += 1
                    break
                i += 1
            continue
        if ch == "/" and i + 1 < n and src[i + 1] == "/":
            while i < n and src[i] != "\n":
                out.append(src[i])
                i += 1
            continue
        if ch == "/" and i + 1 < n and src[i + 1] == "*":
            out.append(src[i])
            i += 1
            while i + 1 < n and not (src[i] == "*" and src[i + 1] == "/"):
                out.append(src[i])
                i += 1
            if i + 1 < n:
                out.append(src[i])
                out.append(src[i + 1])
                i += 2
            continue

        if i + key_len <= n and src[i : i + key_len] == key:
            prev = src[i - 1] if i > 0 else ""
            nxt = src[i + key_len] if i + key_len < n else ""
            prev_ok = not (prev.isalnum() or prev == "_" or prev == "$")
            next_ok = not (nxt.isalnum() or nxt == "_" or nxt == "$")
            if key == "map" and prev == ".":
                out.append(ch)
                i += 1
                continue
            if prev_ok and next_ok:
                out.append(f"st.{key}")
                i += key_len
                continue

        out.append(ch)
        i += 1

    return "".join(out)


for k in KEYS:
    text = replace_idents(text, k)

path.write_text(text, encoding="utf-8")
print("ok", path)
